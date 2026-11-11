/* ===========================================================================
 * The 3D view of the factory (three.js).
 *
 * The static scene comes from the USD snapshot: the same prims, local matrices,
 * shape parameters and colors from the bound materials, instances from the
 * PointInstancer, and the lights and camera written in the scene. The moving parts
 * (drones on the line, robot joint angles, lamps, paint) are set every frame
 * from the simulation state in src/core/factory/sim.ts.
 * ======================================================================== */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Ray,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { PAINT_COLORS, type Paint } from "../../core/factory/layout.ts";
import type { FactorySim, SensorState } from "../../core/factory/sim.ts";
import type { FactorySnapshot, SnapNode } from "../../core/factory/snapshot.ts";

const ROBOT = "/Factory/Stations/Robot";
const GRIPPER = `${ROBOT}/Swivel/Arm/Elbow/Gripper`;
const JOINTS: [string, "y" | "z", "j1" | "j2" | "j3" | "j4"][] = [
  [`${ROBOT}/Swivel`, "y", "j1"],
  [`${ROBOT}/Swivel/Arm`, "z", "j2"],
  [`${ROBOT}/Swivel/Arm/Elbow`, "z", "j3"],
  [GRIPPER, "z", "j4"],
];
const LAMPS: [string, "robot" | "paintShop" | "testCage"][] = [
  [`${ROBOT}/Lamp`, "robot"],
  ["/Factory/Stations/PaintShop/Lamp", "paintShop"],
  ["/Factory/Stations/TestCage/Lamp", "testCage"],
];
const LAMP_COLORS: Record<SensorState["state"], Color> = {
  running: new Color(0.1, 0.95, 0.3),
  idle: new Color(1, 0.55, 0.05),
  fault: new Color(1, 0.05, 0.02),
};
const SHELL = "/Drone/Looks/Shell";

interface DroneView {
  root: Object3D;
  rotors: Object3D[];
  paint: MeshStandardMaterial[];
}

export interface Label {
  text: string;
  pos: [number, number, number];
}

export class FactoryScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private controls: OrbitControls;
  private host: HTMLElement;
  private geoms = new Map<string, BufferGeometry>();
  private mats = new Map<string, MeshStandardMaterial>();
  private byPath = new Map<string, Object3D>();
  private droneTemplate: Object3D | null = null;
  private rotorTemplate: Object3D | null = null;
  private drones = new Map<number, DroneView>();
  private fallen: Object3D[] = [];
  private heldRotor: Object3D | null = null;
  private spray: Mesh | null = null;
  private lampMats = new Map<string, MeshStandardMaterial>();
  private paints: Record<string, Color> = {};
  private resizeObserver: ResizeObserver;
  private disposed = false;
  /** Smooth camera flight to a shot. */
  private flight: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; t: number } | null = null;

  constructor(host: HTMLElement, snap: FactorySnapshot, background: string, labels: Label[]) {
    this.host = host;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    const bg = new Color(background);
    this.scene.background = bg;
    this.scene.fog = new Fog(bg, 38, 80);

    // --- camera from USD: world matrix, vertical angle from the focal length and the sensor
    const cam = snap.camera;
    const fov = (2 * Math.atan(cam.vAp / 2 / cam.focal) * 180) / Math.PI;
    this.camera = new PerspectiveCamera(fov, 16 / 9, cam.clip[0], cam.clip[1]);
    const pos = new Vector3();
    const quat = new Quaternion();
    new Matrix4().fromArray(cam.m).decompose(pos, quat, new Vector3());
    this.camera.position.copy(pos);
    this.camera.quaternion.copy(quat);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 45;
    const forward = new Vector3(0, 0, -1).applyQuaternion(quat);
    const hit = new Vector3();
    if (new Ray(pos, forward).intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit)) {
      this.controls.target.copy(hit);
    }
    this.controls.update();

    this.buildLights(snap);

    // --- static scene from the snapshot
    const objs = this.build(snap.scene.nodes, this.scene);
    for (const inst of snap.scene.instancers) {
      const protos = inst.proto.map((nodes) => {
        const g = new Group();
        this.build(nodes, g, false);
        return g;
      });
      for (const it of inst.inst) {
        const holder = new Group();
        holder.matrixAutoUpdate = false;
        holder.matrix.fromArray(it.m);
        holder.add(protos[it.i].clone(true));
        objs[inst.w].add(holder);
      }
    }

    // --- drone template from the asset, and a rotor template
    if (snap.drone) {
      const g = new Group();
      const dObjs = this.build(snap.drone, g, false);
      this.droneTemplate = g;
      const idx = snap.drone.findIndex((n) => n.p.endsWith("/Rotors/Rotor_1"));
      if (idx >= 0) {
        const r = dObjs[idx].clone(true);
        r.matrixAutoUpdate = true;
        r.position.set(0, 0, 0);
        r.rotation.set(0, 0, 0);
        r.scale.set(1, 1, 1);
        this.rotorTemplate = r;
      }
    }
    if (snap.paints) {
      for (const [name, c] of Object.entries(snap.paints)) this.paints[name] = new Color(c[0], c[1], c[2]);
    }

    // --- the rotor in the gripper and the paint spray
    const gripper = this.byPath.get(GRIPPER);
    if (gripper && this.rotorTemplate) {
      this.heldRotor = this.rotorTemplate.clone(true);
      this.heldRotor.position.set(0.16, 0, 0);
      this.heldRotor.rotation.set(0, 0, Math.PI / 2);
      this.heldRotor.visible = false;
      gripper.add(this.heldRotor);
    }
    if (this.byPath.has("/Factory/Stations/PaintShop")) {
      this.spray = new Mesh(
        new ConeGeometry(0.34, 0.85, 24, 1, true),
        new MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }),
      );
      this.spray.position.set(0, 1.32, 0);
      this.spray.visible = false;
      this.scene.add(this.spray);
    }
    for (const [path] of LAMPS) {
      const lamp = this.byPath.get(path) as Mesh | undefined;
      if (!lamp) continue;
      const m = new MeshStandardMaterial({ color: 0x222222, emissive: LAMP_COLORS.idle, emissiveIntensity: 2 });
      lamp.material = m;
      this.lampMats.set(path, m);
    }

    for (const l of labels) this.scene.add(makeLabel(l));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  private buildLights(snap: FactorySnapshot) {
    for (const l of snap.lights) {
      const color = new Color(l.c[0], l.c[1], l.c[2]);
      if (l.k === "DistantLight") {
        // a DistantLight shines along -Z of its transform
        const dir = new Vector3(0, 0, -1).transformDirection(new Matrix4().fromArray(l.m));
        const light = new DirectionalLight(color, l.i);
        light.position.copy(dir.clone().multiplyScalar(-30));
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        const s = light.shadow.camera;
        s.left = -18;
        s.right = 18;
        s.top = 18;
        s.bottom = -18;
        s.near = 1;
        s.far = 70;
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.02;
        this.scene.add(light);
        this.scene.add(light.target);
      } else {
        this.scene.add(new HemisphereLight(color, new Color(0.18, 0.17, 0.16), l.i * 2.4));
      }
    }
  }

  private geometry(n: SnapNode): BufferGeometry {
    const g = n.g ?? {};
    const key = `${n.k}|${g.size}|${g.radius}|${g.height}|${g.axis}`;
    let geo = this.geoms.get(key);
    if (geo) return geo;
    if (n.k === "Cube") geo = new BoxGeometry(g.size ?? 2, g.size ?? 2, g.size ?? 2);
    else if (n.k === "Sphere") geo = new SphereGeometry(g.radius ?? 1, 28, 16);
    else if (n.k === "Cone") geo = new ConeGeometry(g.radius ?? 1, g.height ?? 2, 24);
    else geo = new CylinderGeometry(g.radius ?? 1, g.radius ?? 1, g.height ?? 2, 24);
    // three draws cylinders and cones along Y - USD lets you pick the axis
    if (g.axis === "X") geo.rotateZ(-Math.PI / 2);
    if (g.axis === "Z") geo.rotateX(Math.PI / 2);
    this.geoms.set(key, geo);
    return geo;
  }

  private material(n: SnapNode): MeshStandardMaterial {
    const c = n.c ?? [0.5, 0.5, 0.5];
    const key = JSON.stringify([c, n.e, n.o, n.ro, n.me]);
    let m = this.mats.get(key);
    if (m) return m;
    const opacity = n.o ?? 1;
    m = new MeshStandardMaterial({
      color: new Color(c[0], c[1], c[2]),
      roughness: n.ro ?? 0.7,
      metalness: n.me ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    if (n.e) {
      m.emissive = new Color(n.e[0], n.e[1], n.e[2]);
      m.emissiveIntensity = 1.4;
    }
    this.mats.set(key, m);
    return m;
  }

  /** USD node tree -> three objects. Returns the objects in node order. */
  private build(nodes: SnapNode[], root: Object3D, register = true): Object3D[] {
    const objs: Object3D[] = [];
    for (const n of nodes) {
      let o: Object3D;
      if (n.g) {
        const mesh = new Mesh(this.geometry(n), this.material(n));
        mesh.castShadow = !(n.o !== undefined && n.o < 1) && !n.p.endsWith("/Floor");
        mesh.receiveShadow = true;
        mesh.userData.mat = n.mat;
        o = mesh;
      } else {
        o = new Group();
      }
      o.name = n.p;
      if (n.x) {
        // nodes with one rotation - the twin can change the angle
        o.position.set(n.x.t[0], n.x.t[1], n.x.t[2]);
        const a = (n.x.a * Math.PI) / 180;
        if (n.x.ax === "X") o.rotation.x = a;
        if (n.x.ax === "Y") o.rotation.y = a;
        if (n.x.ax === "Z") o.rotation.z = a;
      } else {
        o.matrixAutoUpdate = false;
        o.matrix.fromArray(n.m);
      }
      (n.u >= 0 ? objs[n.u] : root).add(o);
      objs.push(o);
      if (register) this.byPath.set(n.p, o);
    }
    return objs;
  }

  private droneView(id: number): DroneView | null {
    const existing = this.drones.get(id);
    if (existing) return existing;
    if (!this.droneTemplate) return null;
    const root = this.droneTemplate.clone(true);
    const rotors: Object3D[] = [];
    const paint: MeshStandardMaterial[] = [];
    root.traverse((o) => {
      if (/\/Rotors\/Rotor_\d$/.test(o.name)) rotors.push(o);
      const mesh = o as Mesh;
      if (mesh.isMesh && mesh.userData.mat === SHELL) {
        const m = (mesh.material as MeshStandardMaterial).clone();
        mesh.material = m;
        paint.push(m);
      }
    });
    rotors.sort((a, b) => a.name.localeCompare(b.name));
    for (const r of rotors) r.matrixAutoUpdate = true;
    // rotor matrices from USD -> position, so that they can turn
    rotors.forEach((r) => {
      r.matrix.decompose(r.position, r.quaternion, r.scale);
    });
    root.matrixAutoUpdate = true;
    root.position.set(0, 0, 0);
    const view = { root, rotors, paint };
    this.scene.add(root);
    this.drones.set(id, view);
    return view;
  }

  /** Camera flight to a shot (position and the point it looks at). */
  focus(pos: [number, number, number], target: [number, number, number]) {
    this.flight = {
      from: [this.camera.position.clone(), this.controls.target.clone()],
      to: [new Vector3(...pos), new Vector3(...target)],
      t: 0,
    };
  }

  /** Animation frame: moves the simulation state onto the objects. dt - simulation time, realDt - screen time. */
  sync(sim: FactorySim, dt: number, realDt: number, showStock: boolean) {
    if (this.flight) {
      this.flight.t = Math.min(1, this.flight.t + realDt / 0.9);
      const k = this.flight.t * this.flight.t * (3 - 2 * this.flight.t);
      this.camera.position.lerpVectors(this.flight.from[0], this.flight.to[0], k);
      this.controls.target.lerpVectors(this.flight.from[1], this.flight.to[1], k);
      if (this.flight.t >= 1) this.flight = null;
    }
    for (const [path, axis, j] of JOINTS) {
      const o = this.byPath.get(path);
      if (o) o.rotation[axis] = (sim.joints[j] * Math.PI) / 180;
    }
    if (this.heldRotor) this.heldRotor.visible = sim.holding;

    const sample = this.byPath.get("/Factory/Showcase/Sample");
    if (sample) sample.rotation.y += dt * 0.35;

    // drones on the line
    const alive = new Set<number>();
    for (const d of sim.drones) {
      const v = this.droneView(d.id);
      if (!v) continue;
      alive.add(d.id);
      v.root.position.set(d.pos[0], d.pos[1], d.pos[2]);
      v.root.rotation.set(d.tilt[0], 0, d.tilt[1]);
      v.rotors.forEach((r, i) => {
        r.visible = d.rotors[i];
        r.rotation.y = (i % 2 ? -1 : 1) * d.spin;
      });
      const base = this.paints.gray;
      const target = this.paints[d.order] ?? colorOf(d.order);
      if (base && target) {
        for (const m of v.paint) m.color.copy(base).lerp(target, d.paint);
      }
    }
    for (const [id, v] of this.drones) {
      if (!alive.has(id)) {
        this.scene.remove(v.root);
        v.paint.forEach((m) => m.dispose());
        this.drones.delete(id);
      }
    }

    // rotors dropped by the robot
    while (this.fallen.length < sim.fallen.length && this.rotorTemplate) {
      const r = this.rotorTemplate.clone(true);
      this.scene.add(r);
      this.fallen.push(r);
    }
    while (this.fallen.length > sim.fallen.length) {
      const r = this.fallen.shift();
      if (r) this.scene.remove(r);
    }
    sim.fallen.forEach((f, i) => this.fallen[i]?.position.set(f.pos[0], f.pos[1], f.pos[2]));

    // paint shop: spray in the color of the order
    if (this.spray) {
      const painting = sim.drones.find((d) => d.stage === "paint");
      this.spray.visible = !!painting;
      if (painting) {
        const m = this.spray.material as MeshBasicMaterial;
        m.color.copy(this.paints[painting.order] ?? colorOf(painting.order));
        m.opacity = 0.25 + 0.15 * Math.sin(sim.time * 18);
      }
    }

    // status lamps from the sensors
    for (const [path, key] of LAMPS) {
      const m = this.lampMats.get(path);
      if (!m) continue;
      const s = sim.sensors[key].state;
      m.emissive.copy(LAMP_COLORS[s]);
      m.emissiveIntensity = s === "fault" ? (Math.sin(sim.time * 10) > 0 ? 3 : 0.3) : 2;
    }

    // the warehouse stock drones from USD disappear after the first shipment
    for (let i = 1; i <= 8; i++) {
      const o = this.byPath.get(`/Factory/Warehouse/Drone_${String(i).padStart(2, "0")}`);
      if (o) o.visible = showStock && sim.shipments === 0;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** Goes back to the frame of the camera written in USD. */
  resetCamera(snap: FactorySnapshot) {
    const pos = new Vector3();
    const quat = new Quaternion();
    new Matrix4().fromArray(snap.camera.m).decompose(pos, quat, new Vector3());
    const hit = new Vector3();
    new Ray(pos, new Vector3(0, 0, -1).applyQuaternion(quat)).intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit);
    this.focus([pos.x, pos.y, pos.z], [hit.x, hit.y, hit.z]);
  }

  private resize() {
    if (this.disposed) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m: Material) => m.dispose());
      }
      const sprite = o as Sprite;
      if (sprite.isSprite) sprite.material.map?.dispose();
    });
    this.geoms.forEach((g) => g.dispose());
    this.renderer.dispose();
    // browsers keep few WebGL contexts - give it back now, do not wait for GC
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function colorOf(p: Paint): Color {
  const c = PAINT_COLORS[p];
  return new Color(c[0], c[1], c[2]);
}

/** Station label: text on a canvas as a sprite, always facing the camera. */
function makeLabel(l: Label): Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = "600 44px system-ui, sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(l.text).width) + 40;
  canvas.width = w;
  canvas.height = 72;
  ctx.font = font;
  ctx.fillStyle = "rgba(10, 14, 22, 0.72)";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 72, 16);
  ctx.fill();
  ctx.fillStyle = "#f2ead8";
  ctx.textBaseline = "middle";
  ctx.fillText(l.text, 20, 38);
  const tex = new CanvasTexture(canvas);
  const sprite = new Sprite(new SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set((w / 72) * 0.55, 0.55, 1);
  sprite.position.set(l.pos[0], l.pos[1], l.pos[2]);
  sprite.renderOrder = 10;
  return sprite;
}
