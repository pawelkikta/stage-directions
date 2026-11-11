/* ===========================================================================
 * Drone Factory - the twin engine in the browser.
 *
 * It does not pretend to be PhysX: it is a simple event model of the line (belt
 * with a queue, robot with a cycle time, paint shop, test flight, warehouse) and
 * the robot kinematics. Positions come from layout.ts (the same numbers USD was
 * made from), joint limits and default parameters - from the step's USD snapshot.
 * ======================================================================== */
import {
  BELT,
  BIN_POS,
  CAGE_PAD_TOP,
  CAGE_POS,
  DRONE,
  PAINTS,
  RACK_POS,
  RACK_TOP,
  ROBOT,
  ROBOT_POS,
  STATION_X,
  slotPosition,
  type Paint,
  type Vec3,
} from "./layout.ts";
import { ROBOT_HOME, ROBOT_LIMITS, ROTOR_XZ } from "./usd.ts";

export type Stage =
  | "belt" // rides or waits on the belt
  | "assembly" // the robot screws on the rotors
  | "paint"
  | "transfer" // from the end of the belt to the test pad
  | "test" // take-off, hover
  | "flight" // to the warehouse
  | "fall" // failed the test
  | "pickup" // no test: from the end of the belt to the warehouse
  | "stored"
  | "rejected";

export interface Drone {
  id: number;
  pos: Vec3;
  /** Tilt (rad) around the X and Z axes - in a failed test. */
  tilt: [number, number];
  stage: Stage;
  /** Which rotors are already on the drone. */
  rotors: boolean[];
  /** Which rotor the robot will drop (-1 = none). */
  defect: number;
  order: Paint;
  /** 0..1 - how much paint is already on. */
  paint: number;
  mounted: boolean;
  painted: boolean;
  /** Rotor angle (rad) - they spin in the test and in flight. */
  spin: number;
  /** Time in the current stage (s). */
  t: number;
  slot: number;
  from: Vec3;
  to: Vec3;
  /** Stands on the belt, because something in front blocks the way. */
  waiting: boolean;
}

export interface FallingRotor {
  pos: Vec3;
  vy: number;
  rest: boolean;
}

export interface Features {
  belt: boolean;
  robot: boolean;
  paint: boolean;
  sensors: boolean;
  test: boolean;
  /** Warehouse with pallets (step 5+) - before that, drones disappear at the end of the line. */
  warehouse: boolean;
}

export interface Params {
  takt: number;
  beltSpeed: number;
  robotSpeed: number;
  paintSpeed: number;
  mix: Record<Paint, number>;
  /** Chance that the robot drops a rotor (0..1). */
  defectRate: number;
  robotFault: boolean;
}

export type JointName = "j1" | "j2" | "j3" | "j4";
export type Joints = Record<JointName, number>;

export interface SensorState {
  state: "running" | "idle" | "fault";
  temperature: number;
  count: number;
}

const SPACING = 0.72;
const SPAWN_X = BELT.xStart + 0.35;
const END_X = BELT.xEnd - 0.4;
const ROTOR_CYCLE = 1; // s per rotor at speed 1
const PAINT_TIME = 3; // s at speed 1
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* --------------------------------------------------------- kinematics --- */

export type Limits = Record<JointName, [number, number]>;

/** Joint angles that put the gripper tip on a point, pointing down. */
export function inverseKinematics(target: Vec3, limits: Limits = ROBOT_LIMITS): Joints {
  const dx = target[0] - ROBOT_POS[0];
  const dz = target[2] - ROBOT_POS[2];
  const d = Math.hypot(dx, dz);
  const h = target[1] + ROBOT.tool - ROBOT.shoulder;
  const L1 = ROBOT.upper;
  const L2 = ROBOT.fore;
  const c3 = Math.max(-1, Math.min(1, (d * d + h * h - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
  const t3 = -Math.acos(c3);
  const t2 = Math.atan2(h, d) - Math.atan2(L2 * Math.sin(t3), L1 + L2 * Math.cos(t3));
  const j: Joints = {
    j1: deg(Math.atan2(-dz, dx)),
    j2: deg(t2),
    j3: deg(t3),
    j4: -90 - deg(t2) - deg(t3),
  };
  for (const k of Object.keys(j) as JointName[]) {
    j[k] = Math.max(limits[k][0], Math.min(limits[k][1], j[k]));
  }
  return j;
}

/** Position of the gripper tip for given angles. */
export function toolTip(j: Joints): Vec3 {
  const a2 = rad(j.j2);
  const a3 = a2 + rad(j.j3);
  const a4 = a3 + rad(j.j4);
  const r = ROBOT.upper * Math.cos(a2) + ROBOT.fore * Math.cos(a3) + ROBOT.tool * Math.cos(a4);
  const y = ROBOT.shoulder + ROBOT.upper * Math.sin(a2) + ROBOT.fore * Math.sin(a3) + ROBOT.tool * Math.sin(a4);
  const yaw = rad(j.j1);
  return [ROBOT_POS[0] + r * Math.cos(yaw), y, ROBOT_POS[2] - r * Math.sin(yaw)];
}

const PICK: Vec3 = [RACK_POS[0], RACK_TOP + 0.02, RACK_POS[2]];

/** Mount point of rotor k on the drone that stands in the station. */
function mountPoint(k: number): Vec3 {
  const [x, z] = ROTOR_XZ[k];
  return [STATION_X.assembly + x, BELT.top + DRONE.rotorY + 0.02, z];
}

/* ------------------------------------------------------------- simulation --- */

type RobotPhase = "idle" | "toRack" | "grip" | "toDrone" | "mount";

export class FactorySim {
  time = 0;
  drones: Drone[] = [];
  fallen: FallingRotor[] = [];
  joints: Joints = { ...ROBOT_HOME };
  holding = false;
  /** Warehouse: null = free, "stock" = drone from USD (initial stock), number = drone id. */
  slots: (number | "stock" | null)[] = [];
  shipped = 0;
  /** How many times the pallets were shipped - then the twin hides the drones of the initial stock. */
  shipments = 0;
  ok = 0;
  nok = 0;
  spawned = 0;
  busy = { assembly: 0, paint: 0, test: 0 };
  sensors: Record<"robot" | "paintShop" | "testCage", SensorState> = {
    robot: { state: "idle", temperature: 20, count: 0 },
    paintShop: { state: "idle", temperature: 20, count: 0 },
    testCage: { state: "idle", temperature: 20, count: 0 },
  };
  private done: number[] = [];
  private nextId = 1;
  private sinceSpawn = 1e9;
  private robotPhase: RobotPhase = "idle";
  private phaseT = 0;
  private phaseFrom: Joints = { ...ROBOT_HOME };
  private phaseTo: Joints = { ...ROBOT_HOME };
  private rotorIdx = 0;
  private rng: () => number;
  features: Features;
  private limits: Limits;

  constructor(features: Features, limits: Limits = ROBOT_LIMITS, initialStock = 0, seed = 7) {
    this.features = features;
    this.limits = limits;
    this.slots = Array.from({ length: 12 }, (_, i) => (i < initialStock ? "stock" : null));
    let s = seed;
    this.rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /** Drones per hour over the last 5 minutes of simulation time. */
  get perHour(): number {
    const window = Math.min(this.time, 300);
    if (window < 30) return 0;
    return (this.done.filter((t) => t > this.time - window).length * 3600) / window;
  }

  utilization(station: keyof FactorySim["busy"]): number {
    return this.time > 0 ? this.busy[station] / this.time : 0;
  }

  /** Drones that stand on the belt, because there is a jam in front of them. */
  queue(): number {
    return this.drones.filter((d) => d.stage === "belt" && d.waiting).length;
  }

  private pickPaint(mix: Params["mix"]): Paint {
    const total = PAINTS.reduce((s, p) => s + Math.max(0, mix[p]), 0);
    if (total <= 0) return "gray";
    let x = this.rng() * total;
    for (const p of PAINTS) {
      x -= Math.max(0, mix[p]);
      if (x <= 0) return p;
    }
    return "gray";
  }

  private freeSlot(): number {
    let i = this.slots.indexOf(null);
    if (i < 0) {
      // full warehouse: the pallets go to the customer and come back empty
      this.shipped += this.slots.length;
      this.shipments++;
      this.slots = this.slots.map(() => null);
      this.drones = this.drones.filter((d) => d.stage !== "stored");
      i = 0;
    }
    return i;
  }

  step(dt: number, p: Params): void {
    this.time += dt;
    this.sinceSpawn += dt;
    if (!this.features.belt) return;

    // --- feeder
    const blocked = this.drones.some((d) => d.stage === "belt" && d.pos[0] < SPAWN_X + SPACING);
    if (this.sinceSpawn >= p.takt && !blocked) {
      this.sinceSpawn = 0;
      this.spawned++;
      this.drones.push({
        id: this.nextId++,
        pos: [SPAWN_X, BELT.top, 0],
        tilt: [0, 0],
        stage: "belt",
        // the body arrives without rotors - the robot mounts them (from step 4)
        rotors: [false, false, false, false],
        defect: this.features.test && this.rng() < p.defectRate ? Math.floor(this.rng() * 4) : -1,
        order: this.features.paint ? this.pickPaint(p.mix) : "gray",
        paint: 0,
        mounted: !this.features.robot,
        painted: !this.features.paint,
        spin: 0,
        t: 0,
        slot: -1,
        from: [0, 0, 0],
        to: [0, 0, 0],
        waiting: false,
      });
    }

    this.stepBelt(dt, p);
    this.stepRobot(dt, p);
    this.stepPaint(dt, p);
    this.stepTest(dt);
    this.stepFlights(dt);
    this.stepFallen(dt);
    this.stepSensors(dt, p);
  }

  /** Belt with a queue: a drone rides to the nearest target and does not run into the one in front. */
  private stepBelt(dt: number, p: Params) {
    const onBelt = this.drones.filter((d) => d.stage === "belt").sort((a, b) => b.pos[0] - a.pos[0]);
    const stationBusy = (x: number) =>
      this.drones.some((d) => (d.stage === "assembly" || d.stage === "paint") && Math.abs(d.pos[0] - x) < 0.01);
    for (const d of onBelt) {
      const target = !d.mounted ? STATION_X.assembly : !d.painted ? STATION_X.paint : END_X;
      // the nearest object in front of the drone: another drone on the belt or in a station
      let ahead = Infinity;
      for (const o of this.drones) {
        if (o === d) continue;
        const inLine = o.stage === "belt" || o.stage === "assembly" || o.stage === "paint";
        if (inLine && o.pos[0] > d.pos[0]) ahead = Math.min(ahead, o.pos[0] - SPACING);
      }
      const stop = Math.min(target, ahead);
      const before = d.pos[0];
      d.pos[0] = Math.min(stop, d.pos[0] + p.beltSpeed * dt);
      d.waiting = d.pos[0] - before < p.beltSpeed * dt * 0.5;
      d.pos[1] = BELT.top;

      if (Math.abs(d.pos[0] - target) < 1e-6) {
        if (target === STATION_X.assembly && !stationBusy(target)) {
          d.stage = "assembly";
          d.t = 0;
        } else if (target === STATION_X.paint && !stationBusy(target)) {
          d.stage = "paint";
          d.t = 0;
        } else if (target === END_X) {
          this.leaveBelt(d);
        }
      }
    }
  }

  private leaveBelt(d: Drone) {
    if (this.features.test) {
      if (this.drones.some((o) => o.stage === "transfer" || o.stage === "test")) return;
      d.stage = "transfer";
      d.t = 0;
      d.from = [...d.pos];
      d.to = [CAGE_POS[0], CAGE_PAD_TOP, CAGE_POS[2]];
      return;
    }
    if (!this.features.warehouse) {
      // without a warehouse the drone disappears at pickup at the end of the line
      this.drones = this.drones.filter((o) => o !== d);
      this.ok++;
      this.done.push(this.time);
      return;
    }
    if (this.drones.some((o) => o.stage === "pickup")) return;
    d.stage = "pickup";
    d.t = 0;
    d.slot = this.freeSlot();
    this.slots[d.slot] = d.id;
    d.from = [...d.pos];
    d.to = slotPosition(d.slot);
  }

  private setPhase(phase: RobotPhase, to: Joints) {
    this.robotPhase = phase;
    this.phaseT = 0;
    this.phaseFrom = { ...this.joints };
    this.phaseTo = to;
  }

  /** Robot: four rotors one by one - rack, grip, drone, screw on. */
  private stepRobot(dt: number, p: Params) {
    if (!this.features.robot) return;
    const drone = this.drones.find((d) => d.stage === "assembly");
    if (p.robotFault) return; // fault: the robot stops, the line waits
    const cycle = ROTOR_CYCLE / Math.max(0.05, p.robotSpeed);
    const share: Record<RobotPhase, number> = { idle: 0.35, toRack: 0.38, grip: 0.1, toDrone: 0.4, mount: 0.12 };
    if (drone) this.busy.assembly += dt;

    this.phaseT += dt / (cycle * share[this.robotPhase]);
    const k = Math.min(1, this.phaseT);
    for (const j of Object.keys(this.joints) as JointName[]) {
      this.joints[j] = lerp(this.phaseFrom[j], this.phaseTo[j], smooth(k));
    }
    // defect: halfway to the drone the gripper lets the rotor go - it falls to the floor
    if (this.robotPhase === "toDrone" && this.holding && k >= 0.45 && drone?.defect === this.rotorIdx) {
      this.holding = false;
      this.fallen.push({ pos: toolTip(this.joints), vy: 0, rest: false });
    }
    if (k < 1) return;

    switch (this.robotPhase) {
      case "idle":
        if (drone) {
          this.rotorIdx = drone.rotors.findIndex((r) => !r);
          this.setPhase("toRack", inverseKinematics(PICK, this.limits));
        } else if (!sameJoints(this.joints, ROBOT_HOME)) {
          this.setPhase("idle", { ...ROBOT_HOME });
        }
        break;
      case "toRack":
        this.holding = true;
        this.setPhase("grip", inverseKinematics(addY(PICK, 0.12), this.limits));
        break;
      case "grip":
        this.setPhase("toDrone", inverseKinematics(mountPoint(this.rotorIdx), this.limits));
        break;
      case "toDrone":
        // the gripper is above the drone arm: the rotor stays on the motor (if it did not fall)
        if (drone && this.holding) {
          drone.rotors[this.rotorIdx] = true;
          this.sensors.robot.count++;
        }
        this.holding = false;
        this.setPhase("mount", inverseKinematics(addY(mountPoint(this.rotorIdx), 0.12), this.limits));
        break;
      case "mount": {
        const next = drone ? drone.rotors.findIndex((r, i) => !r && i > this.rotorIdx) : -1;
        if (drone && next >= 0) {
          this.rotorIdx = next;
          this.setPhase("toRack", inverseKinematics(PICK, this.limits));
          break;
        }
        if (drone) {
          drone.mounted = true;
          drone.stage = "belt";
        }
        this.setPhase("idle", { ...ROBOT_HOME });
        break;
      }
    }
  }

  private stepPaint(dt: number, p: Params) {
    const drone = this.drones.find((d) => d.stage === "paint");
    if (!drone) return;
    this.busy.paint += dt;
    drone.t += dt;
    drone.paint = Math.min(1, drone.t / (PAINT_TIME / Math.max(0.05, p.paintSpeed)));
    if (drone.paint >= 1) {
      drone.painted = true;
      drone.stage = "belt";
      this.sensors.paintShop.count++;
    }
  }

  /** Test flight: spin-up, take-off, hover - or a tilt and a fall. */
  private stepTest(dt: number) {
    for (const d of this.drones) {
      if (d.stage === "transfer") {
        d.t += dt;
        const k = smooth(Math.min(1, d.t / 1.2));
        d.pos = [lerp(d.from[0], d.to[0], k), lerp(d.from[1], d.to[1], k), lerp(d.from[2], d.to[2], k)];
        if (d.t >= 1.2) {
          d.stage = "test";
          d.t = 0;
        }
      } else if (d.stage === "test") {
        this.busy.test += dt;
        d.t += dt;
        const ok = d.rotors.every(Boolean);
        d.spin += dt * Math.min(60, d.t * 60);
        if (d.t > 0.6) {
          const lift = smooth(Math.min(1, (d.t - 0.6) / 1.2));
          d.pos[1] = CAGE_PAD_TOP + (ok ? 1.1 : 0.5) * lift + (ok ? 0.03 * Math.sin(d.t * 5) : 0);
        }
        if (!ok && d.t > 0.9) {
          // a rotor is missing: the drone tilts toward the empty arm
          const [x, z] = ROTOR_XZ[d.rotors.findIndex((r) => !r)];
          const lean = Math.min(1.2, (d.t - 0.9) * 1.4);
          d.tilt = [Math.sign(z) * lean, -Math.sign(x) * lean];
        }
        if (ok && d.t >= 3.4) {
          d.stage = "flight";
          d.t = 0;
          d.slot = this.freeSlot();
          this.slots[d.slot] = d.id;
          d.from = [...d.pos];
          d.to = slotPosition(d.slot);
          this.sensors.testCage.count++;
        } else if (!ok && d.t >= 1.9) {
          d.stage = "fall";
          d.t = 0;
          d.from = [...d.pos];
          const n = this.drones.filter((o) => o.stage === "rejected").length;
          d.to = [BIN_POS[0] + ((n % 3) - 1) * 0.22, 0.06 + Math.floor(n / 3) * 0.08, BIN_POS[2] + ((n % 2) - 0.5) * 0.2];
          this.sensors.testCage.count++;
        }
      }
    }
  }

  /** Flights and moves: an arc from the point from to the point to. */
  private stepFlights(dt: number) {
    for (const d of this.drones) {
      if (d.stage !== "flight" && d.stage !== "pickup" && d.stage !== "fall") continue;
      d.t += dt;
      const dur = d.stage === "flight" ? 2.6 : d.stage === "pickup" ? 2.2 : 1.1;
      const k = Math.min(1, d.t / dur);
      if (d.stage === "fall") {
        // falling: sideways to the bin, down faster and faster
        d.pos = [lerp(d.from[0], d.to[0], k), lerp(d.from[1], d.to[1], k * k), lerp(d.from[2], d.to[2], k)];
        d.tilt = [d.tilt[0] + dt * 2, d.tilt[1] + dt * 1.5];
        d.spin += dt * 20;
      } else {
        const e = smooth(k);
        const arc = (d.stage === "flight" ? 1.8 : 1.2) * Math.sin(Math.PI * k);
        d.pos = [lerp(d.from[0], d.to[0], e), lerp(d.from[1], d.to[1], e) + arc, lerp(d.from[2], d.to[2], e)];
        d.spin += dt * (d.stage === "flight" ? 60 : 0);
      }
      if (k >= 1) {
        if (d.stage === "fall") {
          d.stage = "rejected";
          this.nok++;
          const bin = this.drones.filter((o) => o.stage === "rejected");
          if (bin.length > 9) this.drones = this.drones.filter((o) => o !== bin[0]);
        } else {
          d.stage = "stored";
          d.tilt = [0, 0];
          this.ok++;
          this.done.push(this.time);
        }
      }
    }
  }

  private stepFallen(dt: number) {
    for (const f of this.fallen) {
      if (f.rest) continue;
      f.vy -= 9.81 * dt;
      f.pos[1] += f.vy * dt;
      if (f.pos[1] <= 0.005) {
        f.pos[1] = 0.005;
        f.vy = -f.vy * 0.3;
        if (Math.abs(f.vy) < 0.3) f.rest = true;
      }
    }
    if (this.fallen.length > 12) this.fallen.shift();
  }

  private stepSensors(dt: number, p: Params) {
    if (!this.features.sensors) return;
    const assembly = this.drones.some((d) => d.stage === "assembly");
    const painting = this.drones.some((d) => d.stage === "paint");
    const test = this.drones.some((d) => d.stage === "test");
    const r = this.sensors.robot;
    r.state = p.robotFault ? "fault" : assembly ? "running" : "idle";
    const target = 22 + (assembly && !p.robotFault ? 26 * Math.max(0.2, p.robotSpeed) : 0);
    r.temperature += (target - r.temperature) * Math.min(1, dt / 25);
    const shop = this.sensors.paintShop;
    shop.state = painting ? "running" : "idle";
    shop.temperature += ((painting ? 34 : 22) - shop.temperature) * Math.min(1, dt / 30);
    const cage = this.sensors.testCage;
    cage.state = test ? "running" : "idle";
    cage.temperature += (21 - cage.temperature) * Math.min(1, dt / 30);
  }
}

function sameJoints(a: Joints, b: Joints) {
  return (Object.keys(a) as JointName[]).every((k) => Math.abs(a[k] - b[k]) < 0.01);
}

function addY(v: Vec3, dy: number): Vec3 {
  return [v[0], v[1] + dy, v[2]];
}
