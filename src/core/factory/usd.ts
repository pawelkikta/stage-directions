/* ===========================================================================
 * Drone Factory - the USD files after each build step.
 *
 * factoryFiles(step) returns all the files in the factory folder after that
 * step. The Factory page shows the same texts, and scripts/verify-factory.ts
 * runs them through real USD (the 3D scene comes from them too).
 * ======================================================================== */
import {
  BELT,
  BIN_POS,
  CAGE_POS,
  DISPLAY_POS,
  DISPLAY_TOP,
  DRONE,
  FEEDER_X,
  HALL,
  INITIAL_STOCK,
  PAINT_COLORS,
  PAINTS,
  PALLET_TOP,
  PALLET_Z,
  RACK_POS,
  ROBOT,
  ROBOT_POS,
  WAREHOUSE_X,
  slotPosition,
  type Vec3,
} from "./layout.ts";

/* ----------------------------------------------------------- USDA writer --- */

const num = (n: number): string => {
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? "0" : String(r);
};
const v3 = (v: Vec3) => `(${num(v[0])}, ${num(v[1])}, ${num(v[2])})`;

interface Xf {
  t?: Vec3;
  ry?: number;
  rz?: number;
  rxyz?: Vec3;
  s?: Vec3;
}

interface Prim {
  spec?: "def" | "over";
  type?: string;
  name: string;
  meta?: string[];
  body?: string[];
  xf?: Xf;
  /** Blocks written after the attributes, for example a variantSet. */
  raw?: string[];
  kids?: Prim[];
}

function xfLines(x: Xf): string[] {
  const lines: string[] = [];
  const ops: string[] = [];
  if (x.t) {
    lines.push(`double3 xformOp:translate = ${v3(x.t)}`);
    ops.push("xformOp:translate");
  }
  if (x.rxyz) {
    lines.push(`float3 xformOp:rotateXYZ = ${v3(x.rxyz)}`);
    ops.push("xformOp:rotateXYZ");
  }
  if (x.ry !== undefined) {
    lines.push(`float xformOp:rotateY = ${num(x.ry)}`);
    ops.push("xformOp:rotateY");
  }
  if (x.rz !== undefined) {
    lines.push(`float xformOp:rotateZ = ${num(x.rz)}`);
    ops.push("xformOp:rotateZ");
  }
  if (x.s) {
    lines.push(`float3 xformOp:scale = ${v3(x.s)}`);
    ops.push("xformOp:scale");
  }
  if (ops.length) lines.push(`uniform token[] xformOpOrder = [${ops.map((o) => `"${o}"`).join(", ")}]`);
  return lines;
}

function writePrim(p: Prim, depth: number): string[] {
  const pad = "    ".repeat(depth);
  const indent = (block: string) => block.split("\n").map((l) => (l ? `${pad}    ${l}` : ""));
  const head = `${pad}${p.spec ?? "def"}${p.type ? ` ${p.type}` : ""} "${p.name}"`;
  const out: string[] = [];
  if (p.meta?.length) {
    out.push(`${head} (`, ...p.meta.flatMap(indent), `${pad})`);
  } else {
    out.push(head);
  }
  out.push(`${pad}{`);
  const blocks: string[][] = [];
  const attrs = [...(p.body ?? []), ...(p.xf ? xfLines(p.xf) : [])];
  if (attrs.length) blocks.push(attrs.flatMap(indent));
  for (const r of p.raw ?? []) blocks.push(indent(r));
  for (const k of p.kids ?? []) blocks.push(writePrim(k, depth + 1));
  blocks.forEach((b, i) => out.push(...(i ? ["", ...b] : b)));
  out.push(`${pad}}`);
  return out;
}

function layer(meta: string[], prims: Prim[]): string {
  const head = meta.length
    ? ["#usda 1.0", "(", ...meta.flatMap((m) => m.split("\n").map((l) => `    ${l}`)), ")"]
    : ["#usda 1.0"];
  const body = prims.flatMap((p, i) => (i ? ["", ...writePrim(p, 0)] : writePrim(p, 0)));
  return [...head, "", ...body, ""].join("\n");
}

const stageMeta = (defaultPrim: string) => [`defaultPrim = "${defaultPrim}"`, "metersPerUnit = 1", 'upAxis = "Y"'];

/* ----------------------------------------------------------- shapes --- */

type Look = { color: Vec3; opacity?: number } | { mat: string };

const MBA = "MaterialBindingAPI";

function lookOf(look: Look, apis: string[] = []): { meta: string[]; body: string[] } {
  const all = "mat" in look ? [...apis, MBA] : apis;
  const meta = all.length ? [`prepend apiSchemas = [${all.map((a) => `"${a}"`).join(", ")}]`] : [];
  if ("mat" in look) return { meta, body: [`rel material:binding = <${look.mat.replace(/^<|>$/g, "")}>`] };
  const body = [`color3f[] primvars:displayColor = [${v3(look.color)}]`];
  if (look.opacity !== undefined) body.push(`float[] primvars:displayOpacity = [${num(look.opacity)}]`);
  return { meta, body };
}

function cube(name: string, xf: Xf, look: Look, apis: string[] = [], extra: string[] = []): Prim {
  const l = lookOf(look, apis);
  return { type: "Cube", name, meta: l.meta, body: ["double size = 1", ...extra, ...l.body], xf };
}

function cylinder(name: string, r: number, h: number, axis: "X" | "Y" | "Z", xf: Xf, look: Look, apis: string[] = []): Prim {
  const l = lookOf(look, apis);
  return {
    type: "Cylinder",
    name,
    meta: l.meta,
    body: [`double radius = ${num(r)}`, `double height = ${num(h)}`, `uniform token axis = "${axis}"`, ...l.body],
    xf,
  };
}

function sphere(name: string, r: number, xf: Xf, look: Look, apis: string[] = []): Prim {
  const l = lookOf(look, apis);
  return { type: "Sphere", name, meta: l.meta, body: [`double radius = ${num(r)}`, ...l.body], xf };
}

interface Surface {
  /** Missing = the color comes from a variant (see droneFile). */
  diffuse?: Vec3;
  roughness?: number;
  metallic?: number;
  emissive?: Vec3;
  opacity?: number;
}

function material(name: string, root: string, s: Surface): Prim {
  const shader = [
    'uniform token info:id = "UsdPreviewSurface"',
    ...(s.diffuse ? [`color3f inputs:diffuseColor = ${v3(s.diffuse)}`] : []),
    ...(s.emissive ? [`color3f inputs:emissiveColor = ${v3(s.emissive)}`] : []),
    `float inputs:roughness = ${num(s.roughness ?? 0.5)}`,
    `float inputs:metallic = ${num(s.metallic ?? 0)}`,
    ...(s.opacity !== undefined ? [`float inputs:opacity = ${num(s.opacity)}`] : []),
    "token outputs:surface",
  ];
  return {
    type: "Material",
    name,
    body: [`token outputs:surface.connect = <${root}/${name}/PBR.outputs:surface>`],
    kids: [{ type: "Shader", name: "PBR", body: shader }],
  };
}

function looks(root: string, mats: Record<string, Surface>): Prim {
  return {
    type: "Scope",
    name: "Looks",
    kids: Object.entries(mats).map(([n, s]) => material(n, `${root}/Looks`, s)),
  };
}

const ref = (file: string) => `prepend references = @${file}@`;

/* ------------------------------------------------------------ assets --- */

export const ROTOR_XZ: [number, number][] = [
  [DRONE.arm, DRONE.arm],
  [-DRONE.arm, DRONE.arm],
  [-DRONE.arm, -DRONE.arm],
  [DRONE.arm, -DRONE.arm],
];

function rotorFile(): string {
  const mat = { mat: "</Rotor/Looks/Dark>" };
  return layer(stageMeta("Rotor"), [
    {
      type: "Xform",
      name: "Rotor",
      meta: ['kind = "subcomponent"'],
      kids: [
        cylinder("Hub", 0.014, 0.02, "Y", { t: [0, 0.01, 0] }, mat),
        cube("Blade", { t: [0, 0.012, 0], s: [0.24, 0.005, 0.028] }, mat),
        looks("/Rotor", { Dark: { diffuse: [0.12, 0.12, 0.13], roughness: 0.6 } }),
      ],
    },
  ]);
}

function droneFile(step: number): string {
  const shell = { mat: "</Drone/Looks/Shell>" };
  const black = { mat: "</Drone/Looks/Black>" };
  const physics = step >= 9;
  const col = physics ? ["PhysicsCollisionAPI"] : [];

  const meta = ['kind = "component"'];
  if (step >= 5) meta.push('variants = {\n    string paint = "gray"\n}', 'prepend variantSets = "paint"');
  if (physics) meta.push('prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysicsMassAPI"]');

  const raw: string[] = [];
  if (step >= 5) {
    // Every variant, gray too, writes the color itself. A color in the material's base
    // would be a local opinion - and Local beats Variants, so no paint would work.
    const variants = PAINTS.map(
      (p) =>
        `"${p}" {\n    over "Looks"\n    {\n        over "Shell"\n        {\n            over "PBR"\n            {\n` +
        `                color3f inputs:diffuseColor = ${v3(PAINT_COLORS[p])}\n            }\n        }\n    }\n}`,
    );
    raw.push(`variantSet "paint" = {\n${variants.map((v) => v.split("\n").map((l) => `    ${l}`).join("\n")).join("\n")}\n}`);
  }

  return layer(stageMeta("Drone"), [
    {
      type: "Xform",
      name: "Drone",
      meta,
      body: physics ? ["float physics:mass = 1.2"] : [],
      raw,
      kids: [
        cube("Body", { t: [0, 0.055, 0], s: [0.26, 0.07, 0.26] }, shell, col),
        sphere("Dome", 0.075, { t: [0, 0.09, 0], s: [1, 0.5, 1] }, shell),
        cube("Arm_A", { t: [0, 0.075, 0], ry: 45, s: [0.52, 0.02, 0.035] }, black),
        cube("Arm_B", { t: [0, 0.075, 0], ry: -45, s: [0.52, 0.02, 0.035] }, black),
        cube("Skid_L", { t: [-0.08, 0.01, 0], s: [0.02, 0.02, 0.3] }, black, col),
        cube("Skid_R", { t: [0.08, 0.01, 0], s: [0.02, 0.02, 0.3] }, black, col),
        sphere("Led", 0.014, { t: [0, 0.06, 0.13] }, { mat: "</Drone/Looks/Led>" }),
        {
          type: "Xform",
          name: "Motors",
          kids: ROTOR_XZ.map(([x, z], i) => cylinder(`Motor_${i + 1}`, 0.028, 0.05, "Y", { t: [x, 0.1, z] }, black)),
        },
        {
          type: "Xform",
          name: "Rotors",
          kids: ROTOR_XZ.map(([x, z], i) => ({
            name: `Rotor_${i + 1}`,
            meta: [ref("./rotor.usda")],
            xf: { t: [x, DRONE.rotorY, z] },
          })),
        },
        looks("/Drone", {
          Shell: { diffuse: step >= 5 ? undefined : PAINT_COLORS.gray, roughness: 0.35, metallic: 0.1 },
          Black: { diffuse: [0.06, 0.06, 0.07], roughness: 0.5 },
          Led: { diffuse: [0.05, 0.3, 0.1], emissive: [0.1, 1, 0.35] },
        }),
      ],
    },
  ]);
}

function segmentFile(): string {
  const steel = { color: [0.55, 0.58, 0.62] as Vec3 };
  const leg = { color: [0.3, 0.32, 0.35] as Vec3 };
  return layer(stageMeta("Segment"), [
    {
      type: "Xform",
      name: "Segment",
      kids: [
        cube("Band", { t: [0, 0.78, 0], s: [1, 0.03, 0.8] }, { color: [0.1, 0.1, 0.11] }),
        cube("Rail_L", { t: [0, 0.8, -0.43], s: [1, 0.1, 0.05] }, steel),
        cube("Rail_R", { t: [0, 0.8, 0.43], s: [1, 0.1, 0.05] }, steel),
        cylinder("Roller", 0.035, 0.8, "Z", { t: [0, 0.73, 0] }, { color: [0.6, 0.62, 0.65] }),
        cube("Leg_L", { t: [0, 0.36, -0.36], s: [0.06, 0.72, 0.06] }, leg),
        cube("Leg_R", { t: [0, 0.36, 0.36], s: [0.06, 0.72, 0.06] }, leg),
      ],
    },
  ]);
}

/** The robot "at rest": arm folded, gripper down. */
export const ROBOT_HOME = { j1: -90, j2: 70, j3: -110, j4: -50 };

export const ROBOT_LIMITS: Record<"j1" | "j2" | "j3" | "j4", [number, number]> = {
  j1: [-170, 170],
  j2: [-20, 135],
  j3: [-160, 10],
  j4: [-135, 135],
};

function robotFile(): string {
  const orange = { mat: "</Robot/Looks/Orange>" };
  const dark = { mat: "</Robot/Looks/Dark>" };
  const steel = { mat: "</Robot/Looks/Steel>" };
  const col = ["PhysicsCollisionAPI"];
  const link = (name: string, t: Vec3, rot: { ry?: number; rz?: number }, kids: Prim[]): Prim => ({
    type: "Xform",
    name,
    meta: ['prepend apiSchemas = ["PhysicsRigidBodyAPI"]'],
    body: ["bool physics:kinematicEnabled = 1"],
    xf: { t, ...rot },
    kids,
  });
  const joint = (name: string, body0: string, body1: string, axis: string, pos0: Vec3, lim: [number, number]): Prim => ({
    type: "PhysicsRevoluteJoint",
    name,
    body: [
      `rel physics:body0 = <${body0}>`,
      `rel physics:body1 = <${body1}>`,
      `uniform token physics:axis = "${axis}"`,
      `point3f physics:localPos0 = ${v3(pos0)}`,
      "point3f physics:localPos1 = (0, 0, 0)",
      `float physics:lowerLimit = ${num(lim[0])}`,
      `float physics:upperLimit = ${num(lim[1])}`,
    ],
  });
  const L = ROBOT_LIMITS;

  return layer(stageMeta("Robot"), [
    {
      type: "Xform",
      name: "Robot",
      meta: ['kind = "component"'],
      kids: [
        cylinder("Base", 0.28, 0.3, "Y", { t: [0, 0.15, 0] }, dark, col),
        link("Swivel", [0, 0.3, 0], { ry: ROBOT_HOME.j1 }, [
          cylinder("Column", 0.16, 0.5, "Y", { t: [0, 0.25, 0] }, orange, col),
          link("Arm", [0, ROBOT.shoulder - 0.3, 0], { rz: ROBOT_HOME.j2 }, [
            sphere("Shoulder", 0.13, {}, dark),
            cube("Beam", { t: [ROBOT.upper / 2, 0, 0], s: [ROBOT.upper, 0.15, 0.17] }, orange, col),
            link("Elbow", [ROBOT.upper, 0, 0], { rz: ROBOT_HOME.j3 }, [
              sphere("Knuckle", 0.1, {}, dark),
              cube("Beam", { t: [ROBOT.fore / 2, 0, 0], s: [ROBOT.fore, 0.11, 0.13] }, orange, col),
              link("Gripper", [ROBOT.fore, 0, 0], { rz: ROBOT_HOME.j4 }, [
                cylinder("Wrist", 0.05, 0.08, "X", { t: [0.04, 0, 0] }, dark),
                cube("Finger_A", { t: [0.11, 0, -0.03], s: [0.06, 0.02, 0.012] }, steel),
                cube("Finger_B", { t: [0.11, 0, 0.03], s: [0.06, 0.02, 0.012] }, steel),
              ]),
            ]),
          ]),
        ]),
        {
          type: "Scope",
          name: "Joints",
          kids: [
            joint("J1_Swivel", "/Robot/Base", "/Robot/Swivel", "Y", [0, 0.15, 0], L.j1),
            joint("J2_Arm", "/Robot/Swivel", "/Robot/Swivel/Arm", "Z", [0, ROBOT.shoulder - 0.3, 0], L.j2),
            joint("J3_Elbow", "/Robot/Swivel/Arm", "/Robot/Swivel/Arm/Elbow", "Z", [ROBOT.upper, 0, 0], L.j3),
            joint("J4_Gripper", "/Robot/Swivel/Arm/Elbow", "/Robot/Swivel/Arm/Elbow/Gripper", "Z", [ROBOT.fore, 0, 0], L.j4),
          ],
        },
        looks("/Robot", {
          Orange: { diffuse: [0.95, 0.42, 0.05], roughness: 0.4 },
          Dark: { diffuse: [0.13, 0.13, 0.15], roughness: 0.5 },
          Steel: { diffuse: [0.7, 0.72, 0.75], roughness: 0.25, metallic: 0.8 },
        }),
      ],
    },
  ]);
}

function paintShopFile(): string {
  const glass = { mat: "</PaintShop/Looks/Glass>" };
  const frame = { mat: "</PaintShop/Looks/Frame>" };
  const post = (i: number, x: number, z: number) => cube(`Post_${i}`, { t: [x, 0.95, z], s: [0.08, 1.9, 0.08] }, frame);
  return layer(stageMeta("PaintShop"), [
    {
      type: "Xform",
      name: "PaintShop",
      meta: ['kind = "component"'],
      kids: [
        cube("Wall_L", { t: [0, 0.95, -0.72], s: [2.4, 1.9, 0.05] }, glass),
        cube("Wall_R", { t: [0, 0.95, 0.72], s: [2.4, 1.9, 0.05] }, glass),
        cube("Roof", { t: [0, 1.92, 0], s: [2.5, 0.08, 1.55] }, frame),
        post(1, -1.22, -0.74),
        post(2, 1.22, -0.74),
        post(3, -1.22, 0.74),
        post(4, 1.22, 0.74),
        {
          type: "Xform",
          name: "Nozzles",
          kids: [-0.6, 0, 0.6].map((x, i) =>
            cylinder(`Nozzle_${i + 1}`, 0.03, 0.15, "Y", { t: [x, 1.8, 0] }, { mat: "</PaintShop/Looks/Steel>" }),
          ),
        },
        cube("Light", { t: [0, 1.87, 0.3], s: [2.2, 0.02, 0.12] }, { mat: "</PaintShop/Looks/Lamp>" }),
        looks("/PaintShop", {
          Glass: { diffuse: [0.55, 0.78, 0.95], roughness: 0.05, opacity: 0.22 },
          Frame: { diffuse: [0.3, 0.32, 0.36], roughness: 0.5 },
          Steel: { diffuse: [0.7, 0.72, 0.75], roughness: 0.25, metallic: 0.8 },
          Lamp: { diffuse: [1, 1, 0.95], emissive: [1, 0.97, 0.85] },
        }),
      ],
    },
  ]);
}

function testCageFile(): string {
  const dark = { mat: "</TestCage/Looks/Dark>" };
  const net = { mat: "</TestCage/Looks/Net>" };
  const posts = [
    [-1.1, -1.1],
    [1.1, -1.1],
    [-1.1, 1.1],
    [1.1, 1.1],
  ].map(([x, z], i) => cube(`Post_${i + 1}`, { t: [x, 1.1, z], s: [0.06, 2.2, 0.06] }, dark));
  return layer(stageMeta("TestCage"), [
    {
      type: "Xform",
      name: "TestCage",
      meta: ['kind = "component"'],
      kids: [
        cube("Pad", { t: [0, 0.4, 0], s: [1.4, 0.8, 1.4] }, { mat: "</TestCage/Looks/Pad>" }, ["PhysicsCollisionAPI"]),
        { type: "Xform", name: "Frame", kids: posts },
        cube("Net_Back", { t: [0, 1.1, -1.1], s: [2.2, 2.2, 0.02] }, net),
        cube("Net_Front", { t: [0, 1.1, 1.1], s: [2.2, 2.2, 0.02] }, net),
        cube("Net_Side", { t: [1.1, 1.1, 0], s: [0.02, 2.2, 2.2] }, net),
        looks("/TestCage", {
          Dark: { diffuse: [0.16, 0.16, 0.18], roughness: 0.5 },
          Net: { diffuse: [0.8, 0.86, 0.9], roughness: 0.3, opacity: 0.14 },
          Pad: { diffuse: [0.18, 0.42, 0.24], roughness: 0.6 },
        }),
      ],
    },
  ]);
}

/* ------------------------------------------------------------ plugin --- */

const PLUG_INFO = `{
    "Plugins": [
        {
            "Info": {
                "Types": {
                    "FactorySchemaMachineAPI": {
                        "alias": {
                            "UsdSchemaBase": "FactoryMachineAPI"
                        },
                        "autoGenerated": true,
                        "bases": ["UsdAPISchemaBase"],
                        "schemaKind": "singleApplyAPI"
                    },
                    "FactorySchemaLineAPI": {
                        "alias": {
                            "UsdSchemaBase": "FactoryLineAPI"
                        },
                        "autoGenerated": true,
                        "bases": ["UsdAPISchemaBase"],
                        "schemaKind": "singleApplyAPI"
                    }
                }
            },
            "LibraryPath": "",
            "Name": "factorySchema",
            "ResourcePath": ".",
            "Root": ".",
            "Type": "resource"
        }
    ]
}
`;

const GENERATED_SCHEMA = `#usda 1.0
(
    "WARNING: THIS FILE IS GENERATED BY usdGenSchema.  DO NOT EDIT."
)

class "FactoryMachineAPI"
{
    float factory:speed = 1 (
        doc = "Work speed multiplier of the machine. 1 = nominal pace."
    )
    token factory:state = "idle" (
        allowedTokens = ["running", "idle", "fault"]
    )
    float factory:temperature = 20 (
        doc = "Drive temperature in degrees Celsius."
    )
    int factory:count = 0 (
        doc = "Number of parts handled since the start of the shift."
    )
}

class "FactoryLineAPI"
{
    float factory:taktTime = 6 (
        doc = "Seconds between two new bodies from the feeder."
    )
    float factory:beltSpeed = 0.5 (
        doc = "Belt speed in meters per second."
    )
}
`;

/* ------------------------------------------------------------ factory --- */

/** The Factory prim after a given step (without the layer header). */
function factoryPrim(step: number): Prim {
  const kids: Prim[] = [];
  const physics = step >= 9;
  const colApi = physics ? ["PhysicsCollisionAPI"] : [];

  // --- step 1: hall, lights, camera
  const columns: Prim[] = [];
  // only the back row of columns at the wall - a front row would hide the line from the camera
  [-12, 0, 12].forEach((x) =>
    columns.push(cylinder(`Column_${columns.length + 1}`, 0.18, 4.5, "Y", { t: [x, 2.25, -6.8] }, { color: [0.42, 0.45, 0.5] })),
  );
  kids.push({
    type: "Xform",
    name: "Hall",
    meta: ['kind = "group"'],
    kids: [
      cube("Floor", { t: [0, -0.05, 0], s: [HALL.sx, 0.1, HALL.sz] }, { color: [0.2, 0.21, 0.23] }, colApi),
      cube("Wall", { t: [0, 2.25, -HALL.sz / 2 - 0.1], s: [HALL.sx, 4.5, 0.2] }, { color: [0.34, 0.36, 0.4] }),
      cube("SafetyLine_1", { t: [-1, 0.006, -1.5], s: [24, 0.012, 0.08] }, { color: [0.9, 0.72, 0.12] }),
      cube("SafetyLine_2", { t: [-1, 0.006, 1.5], s: [24, 0.012, 0.08] }, { color: [0.9, 0.72, 0.12] }),
      { type: "Xform", name: "Columns", kids: columns },
    ],
  });
  kids.push({
    type: "Scope",
    name: "Lights",
    kids: [
      {
        type: "DistantLight",
        name: "Sun",
        body: ["float inputs:intensity = 3", "color3f inputs:color = (1, 0.95, 0.88)", "float inputs:angle = 1"],
        xf: { rxyz: [-50, 35, 0] },
      },
      { type: "DomeLight", name: "Sky", body: ["float inputs:intensity = 0.4", "color3f inputs:color = (0.8, 0.87, 1)"] },
    ],
  });
  kids.push({
    type: "Camera",
    name: "Camera",
    body: [
      "float focalLength = 15",
      "float horizontalAperture = 20.955",
      "float verticalAperture = 11.787",
      "float2 clippingRange = (0.1, 200)",
    ],
    xf: { t: [1, 11, 16.5], rxyz: [-34, 0, 0] },
  });

  // --- step 2: the sample drone on the pedestal
  if (step >= 2) {
    kids.push({
      type: "Xform",
      name: "Showcase",
      meta: ['kind = "group"'],
      kids: [
        cylinder("Pedestal", 0.45, DISPLAY_TOP, "Y", { t: [DISPLAY_POS[0], DISPLAY_TOP / 2, DISPLAY_POS[2]] }, { color: [0.16, 0.17, 0.2] }, colApi),
        {
          name: "Sample",
          meta: [ref("./assets/drone.usda")],
          xf: { t: [DISPLAY_POS[0], DISPLAY_TOP, DISPLAY_POS[2]], ry: 30 },
        },
      ],
    });
  }

  // --- step 3: the belt from a PointInstancer, and the feeder
  if (step >= 3) {
    const positions = Array.from({ length: BELT.segments }, (_, i) => `(${num(BELT.xStart + 0.5 + i)}, 0, 0)`);
    kids.push({
      type: "Xform",
      name: "Line",
      meta: ['kind = "group"', ...(step >= 6 ? ['prepend apiSchemas = ["FactoryLineAPI"]'] : [])],
      kids: [
        {
          type: "PointInstancer",
          name: "Belt",
          body: [
            "rel prototypes = </Factory/Line/Belt/Prototypes/Segment>",
            `int[] protoIndices = [${Array(BELT.segments).fill(0).join(", ")}]`,
            `point3f[] positions = [${positions.join(", ")}]`,
          ],
          kids: [
            {
              type: "Scope",
              name: "Prototypes",
              kids: [{ name: "Segment", meta: [ref("./assets/segment.usda")] }],
            },
          ],
        },
        cube("Feeder", { t: [FEEDER_X, 0.55, 0], s: [0.9, 1.1, 1.1] }, { color: [0.2, 0.36, 0.52] }),
      ],
    });
  }

  // --- step 4: robot and rack; step 5: paint shop; step 6: API and lamps; step 9: test cage
  if (step >= 4) {
    const machineApi = step >= 6 ? ['prepend apiSchemas = ["FactoryMachineAPI"]'] : [];
    const lamp = (t: Vec3): Prim => sphere("Lamp", 0.07, { t }, { color: [0.35, 0.35, 0.35] });
    const stations: Prim[] = [
      {
        name: "Robot",
        meta: [ref("./assets/robot.usda"), ...machineApi],
        xf: { t: ROBOT_POS },
        kids: step >= 6 ? [lamp([0.22, 0.36, 0.22])] : [],
      },
      {
        type: "Xform",
        name: "Rack",
        xf: { t: RACK_POS },
        kids: [
          cube("Cabinet", { t: [0, 0.375, 0], s: [0.8, 0.75, 0.5] }, { color: [0.35, 0.37, 0.4] }),
          cube("Top", { t: [0, 0.775, 0], s: [0.9, 0.05, 0.6] }, { color: [0.45, 0.47, 0.5] }),
          ...[
            [-0.25, -0.12],
            [0.25, -0.12],
            [-0.25, 0.12],
            [0.25, 0.12],
          ].map(([x, z], i): Prim => ({ name: `Spare_${i + 1}`, meta: [ref("./assets/rotor.usda")], xf: { t: [x, 0.8, z] } })),
        ],
      },
    ];
    if (step >= 5) {
      stations.push({
        name: "PaintShop",
        meta: ["prepend payload = @./assets/paint_shop.usda@", ...machineApi],
        xf: { t: [0, 0, 0] },
        kids: step >= 6 ? [lamp([1.1, 2.03, -0.68])] : [],
      });
    }
    if (step >= 9) {
      stations.push({
        name: "TestCage",
        meta: [ref("./assets/test_cage.usda"), ...machineApi],
        xf: { t: CAGE_POS },
        kids: [lamp([-1.1, 2.3, -1.1])],
      });
    }
    kids.push({ type: "Xform", name: "Stations", meta: ['kind = "group"'], kids: stations });
  }

  // --- step 5: warehouse - drones as instances, each with its own paint
  if (step >= 5) {
    kids.push({
      type: "Xform",
      name: "Warehouse",
      meta: ['kind = "group"'],
      kids: [
        ...PALLET_Z.map((z, i) =>
          cube(`Pallet_${i + 1}`, { t: [WAREHOUSE_X, PALLET_TOP / 2, z], s: [1.3, PALLET_TOP, 1.1] }, { color: [0.55, 0.4, 0.22] }, colApi),
        ),
        ...INITIAL_STOCK.map(
          (paint, i): Prim => ({
            name: `Drone_${String(i + 1).padStart(2, "0")}`,
            meta: ["instanceable = true", ref("./assets/drone.usda"), `variants = {\n    string paint = "${paint}"\n}`],
            xf: { t: slotPosition(i) },
          }),
        ),
      ],
    });
  }

  // --- step 9: physics and the reject bin
  if (physics) {
    kids.push({ type: "PhysicsScene", name: "Physics" });
    const red = { color: [0.65, 0.14, 0.1] as Vec3 };
    kids.push({
      type: "Xform",
      name: "RejectBin",
      xf: { t: BIN_POS },
      kids: [
        cube("Bottom", { t: [0, 0.025, 0], s: [0.9, 0.05, 0.9] }, red, ["PhysicsCollisionAPI"]),
        cube("Wall_1", { t: [0, 0.3, -0.45], s: [0.9, 0.5, 0.04] }, red),
        cube("Wall_2", { t: [0, 0.3, 0.45], s: [0.9, 0.5, 0.04] }, red),
        cube("Wall_3", { t: [-0.45, 0.3, 0], s: [0.04, 0.5, 0.9] }, red),
        cube("Wall_4", { t: [0.45, 0.3, 0], s: [0.04, 0.5, 0.9] }, red),
      ],
    });
  }

  return { type: "Xform", name: "Factory", meta: ['kind = "assembly"'], kids };
}

export interface ProcessValues {
  takt: number;
  beltSpeed: number;
  robotSpeed: number;
}

/** The process engineer's layer. The twin shows it live with the slider values. */
export function processText(v: ProcessValues): string {
  return layer(
    [],
    [
      {
        spec: "over",
        name: "Factory",
        kids: [
          {
            spec: "over",
            name: "Line",
            body: [`float factory:taktTime = ${num(v.takt)}`, `float factory:beltSpeed = ${num(v.beltSpeed)}`],
          },
          {
            spec: "over",
            name: "Stations",
            kids: [{ spec: "over", name: "Robot", body: [`float factory:speed = ${num(v.robotSpeed)}`] }],
          },
        ],
      },
    ],
  );
}

export interface LiveSensor {
  name: string;
  state: string;
  temperature: number;
  count: number;
}

/** The twin's session layer: sensor readings, overwritten all the time, never saved. */
export function sessionText(sensors: LiveSensor[]): string {
  return layer(
    [],
    [
      {
        spec: "over",
        name: "Factory",
        kids: [
          {
            spec: "over",
            name: "Stations",
            kids: sensors.map((s) => ({
              spec: "over" as const,
              name: s.name,
              body: [
                `token factory:state = "${s.state}"`,
                `float factory:temperature = ${num(Math.round(s.temperature * 10) / 10)}`,
                `int factory:count = ${s.count}`,
              ],
            })),
          },
        ],
      },
    ],
  );
}

function processFile(): string {
  return processText({ takt: 5, beltSpeed: 0.6, robotSpeed: 1.25 });
}

function nightShiftFile(): string {
  return layer(
    ['doc = "Night shift: the robot runs slower, because the neighbors complain about the noise."'],
    [
      {
        spec: "over",
        name: "Factory",
        kids: [
          {
            spec: "over",
            name: "Stations",
            kids: [{ spec: "over", name: "Robot", body: ["float factory:speed = 0.4"] }],
          },
        ],
      },
    ],
  );
}

/** All the files in the factory folder after a given step (1..9). */
export function factoryFiles(step: number): Record<string, string> {
  const files: Record<string, string> = {};
  if (step >= 7) {
    const subs = [...(step === 8 ? ["./night_shift.usda"] : []), "./process.usda", "./layout.usda"];
    files["factory.usda"] = layer(
      [...stageMeta("Factory"), `subLayers = [\n${subs.map((s) => `    @${s}@`).join(",\n")}\n]`],
      [],
    ).replace(/\n\n$/, "\n");
    files["layout.usda"] = layer([], [factoryPrim(step)]);
    files["process.usda"] = processFile();
    if (step === 8) files["night_shift.usda"] = nightShiftFile();
  } else {
    files["factory.usda"] = layer(stageMeta("Factory"), [factoryPrim(step)]);
  }
  if (step >= 2) {
    files["assets/drone.usda"] = droneFile(step);
    files["assets/rotor.usda"] = rotorFile();
  }
  if (step >= 3) files["assets/segment.usda"] = segmentFile();
  if (step >= 4) files["assets/robot.usda"] = robotFile();
  if (step >= 5) files["assets/paint_shop.usda"] = paintShopFile();
  if (step >= 6) {
    files["factory_schema/plugInfo.json"] = PLUG_INFO;
    files["factory_schema/generatedSchema.usda"] = GENERATED_SCHEMA;
  }
  if (step >= 9) files["assets/test_cage.usda"] = testCageFile();
  return files;
}

export const FACTORY_STEPS = 9;
