/* ===========================================================================
 * Seed scenes - example scenes for the visualizers and the deriver tests.
 * The content follows real USD semantics (types, paths, arcs).
 * ======================================================================== */
import type { Scene } from "./types.ts";

/* --- Scene 1: "Hello Stage" - the basics of L0/L1 ------------------------ */
export const helloStage: Scene = {
  id: "hello-stage",
  title: "Hello Stage",
  description:
    "A minimal stage: an Xform /World with a Mesh /World/Box and one light. " +
    "Shows a prim, a property (attribute), types and paths.",
  rootLayerId: "root",
  layers: [
    {
      id: "root",
      name: "hello.usda",
      defaultPrim: "World",
      rootPrims: [
        {
          name: "World",
          specifier: "def",
          typeName: "Xform",
          kind: "group",
          properties: [],
          children: [
            {
              name: "Box",
              specifier: "def",
              typeName: "Cube",
              properties: [
                {
                  kind: "attribute",
                  name: "size",
                  valueType: "double",
                  value: 2.0,
                },
                {
                  kind: "attribute",
                  name: "primvars:displayColor",
                  valueType: "color3f[]",
                  isPrimvar: true,
                  value: [[0.72, 0.45, 0.2]],
                },
              ],
              children: [],
            },
            {
              name: "KeyLight",
              specifier: "def",
              typeName: "SphereLight",
              properties: [
                {
                  kind: "attribute",
                  name: "inputs:intensity",
                  valueType: "float",
                  value: 800,
                },
                {
                  kind: "attribute",
                  name: "inputs:radius",
                  valueType: "float",
                  value: 0.5,
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

/* --- Scene 2: "Layer Stack" - the basics of L3 (an override in a stronger layer) */
export const layerStackDemo: Scene = {
  id: "layer-stack",
  title: "Layer Stack - override",
  description:
    "Two layers: base.usda defines a Sphere with radius=1, shot.usda (stronger) " +
    "overrides it with radius=3 through an `over`. The composed Usd view shows 3.",
  rootLayerId: "shot",
  layers: [
    {
      id: "shot",
      name: "shot.usda",
      defaultPrim: "World",
      subLayers: ["base.usda"], // the stronger layer stands ABOVE base
      rootPrims: [
        {
          name: "World",
          specifier: "over",
          properties: [],
          children: [
            {
              name: "Ball",
              specifier: "over",
              properties: [
                {
                  kind: "attribute",
                  name: "radius",
                  valueType: "double",
                  value: 3.0, // override
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "base",
      name: "base.usda",
      defaultPrim: "World",
      rootPrims: [
        {
          name: "World",
          specifier: "def",
          typeName: "Xform",
          kind: "group",
          properties: [],
          children: [
            {
              name: "Ball",
              specifier: "def",
              typeName: "Sphere",
              properties: [
                {
                  kind: "attribute",
                  name: "radius",
                  valueType: "double",
                  value: 1.0, // the base value
                },
                {
                  kind: "attribute",
                  name: "xformOp:translate",
                  valueType: "double3",
                  value: [0, 1, 0],
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

export const SEED_SCENES: Scene[] = [helloStage, layerStackDemo];

export function getSeedScene(id: string): Scene | undefined {
  return SEED_SCENES.find((s) => s.id === id);
}
