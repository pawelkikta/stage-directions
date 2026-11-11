/* ===========================================================================
 * Drone Factory - sizes and positions (meters, Y axis up).
 *
 * The USD files (usd.ts) and the motion in the simulation (sim.ts) come from
 * the same numbers, so what moves in the browser stands exactly where the
 * scene says it does. The verifier checks that USD composes them the same way.
 * ======================================================================== */

export type Vec3 = [number, number, number];

/** Hall floor: x from -14 to 14, z from -7 to 7. */
export const HALL = { sx: 28, sz: 14 };

/** Belt: 18 segments of 1 m, from x = -10 to x = 8. */
export const BELT = { xStart: -10, xEnd: 8, segments: 18, top: 0.795, width: 0.8 };

/** Body feeder at the start of the belt. */
export const FEEDER_X = -10.7;

/** Where a drone stops at a station. */
export const STATION_X = { assembly: -5, paint: 0 };

/** The robot stands next to the belt, the rotor rack next to the robot. */
export const ROBOT_POS: Vec3 = [-5, 0, -1.25];
// the rack is on the +x side of the robot: the rack-to-drone path stays inside the J1 limit (±170°)
export const RACK_POS: Vec3 = [-3.9, 0, -1.8];
export const RACK_TOP = 0.8;

/** Robot sizes: shoulder height above the floor and link lengths. */
export const ROBOT = { shoulder: 0.8, upper: 0.9, fore: 0.72, tool: 0.14 };

/** Drone: motor spacing and rotor height above the skids. */
export const DRONE = { arm: 0.184, rotorY: 0.125 };

/** Test cage (step 9) and the reject bin. */
export const CAGE_POS: Vec3 = [9.4, 0, 0];
export const CAGE_PAD_TOP = 0.8;
export const BIN_POS: Vec3 = [9.4, 0, 2.5];

/** Warehouse: three pallets, four places on each. */
export const WAREHOUSE_X = 12.7;
export const PALLET_Z = [-2.4, 0, 2.4];
export const PALLET_TOP = 0.14;
export const SLOT_OFFSETS: [number, number][] = [
  [-0.3, -0.25],
  [0.3, -0.25],
  [-0.3, 0.25],
  [0.3, 0.25],
];

/** Position of a warehouse place (0..11). */
export function slotPosition(slot: number): Vec3 {
  const pallet = Math.floor(slot / 4);
  const [dx, dz] = SLOT_OFFSETS[slot % 4];
  return [WAREHOUSE_X + dx, PALLET_TOP, PALLET_Z[pallet] + dz];
}

/** The sample drone on the pedestal at the entrance (step 2). */
export const DISPLAY_POS: Vec3 = [-12.4, 0, -4.4];
export const DISPLAY_TOP = 0.6;

/** Paint variants (step 5) - the names in variantSet "paint". */
export const PAINTS = ["gray", "red", "blue", "yellow"] as const;
export type Paint = (typeof PAINTS)[number];

export const PAINT_COLORS: Record<Paint, Vec3> = {
  gray: [0.62, 0.64, 0.67],
  red: [0.78, 0.1, 0.08],
  blue: [0.1, 0.3, 0.85],
  yellow: [0.95, 0.72, 0.08],
};

/** Warehouse stock at the start of the shift (step 5): 8 drones in four paints. */
export const INITIAL_STOCK: Paint[] = ["red", "red", "blue", "blue", "yellow", "yellow", "gray", "gray"];
