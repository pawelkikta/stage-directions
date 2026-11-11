/* Types of the scene snapshot that scripts/factory_snapshot.py writes from USD. */

export interface SnapNode {
  /** Prim path. */
  p: string;
  /** Index of the parent in the same list (-1 = root). */
  u: number;
  /** Prim type: Xform, Cube, Sphere, Cylinder, PointInstancer... */
  k: string;
  /** Local matrix in USD order (by rows, translation in the last row). */
  m: number[];
  /** Translate + one rotation - nodes that the twin can turn. */
  x?: { t: number[]; ax: "X" | "Y" | "Z"; a: number };
  /** Shape parameters. */
  g?: { size?: number; radius?: number; height?: number; axis?: "X" | "Y" | "Z" };
  /** Color (linear), emission, opacity, roughness, metallic. */
  c?: number[];
  e?: number[];
  o?: number;
  ro?: number;
  me?: number;
  /** Path of the bound material. */
  mat?: string;
}

export interface SnapInstancer {
  /** Index of the PointInstancer node. */
  w: number;
  /** Prototype trees. */
  proto: SnapNode[][];
  /** Instances: prototype index and the matrix relative to the instancer. */
  inst: { i: number; m: number[] }[];
}

export interface FactorySnapshot {
  scene: { nodes: SnapNode[]; instancers: SnapInstancer[] };
  lights: { k: string; m: number[]; i: number; c: number[] }[];
  camera: { m: number[]; focal: number; hAp: number; vAp: number; clip: number[] };
  limits?: Record<string, [number, number]>;
  /** The value on the stage, the layers from the opinion stack (or "schema") and the values in those layers. */
  params: Record<string, { v: number | string; z: string[]; w: (number | string)[] }>;
  paints?: Record<string, number[]>;
  drone?: SnapNode[];
}
