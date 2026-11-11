import { useMemo, useState } from "react";
import { UsdaPane } from "../UsdaPane.tsx";
import { TreePane } from "../TreePane.tsx";
import { SEED_SCENES } from "../../core/seedScenes.ts";
import { deriveUsda, getLayer } from "../../core/deriveUsda.ts";
import { deriveTree } from "../../core/deriveTree.ts";

function SceneLayerPicker({
  sceneId,
  layerId,
  onScene,
  onLayer,
}: {
  sceneId: string;
  layerId: string;
  onScene: (id: string) => void;
  onLayer: (id: string) => void;
}) {
  const scene = SEED_SCENES.find((s) => s.id === sceneId)!;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
      <label className="flex items-center gap-2">
        Scene
        <select
          value={sceneId}
          onChange={(e) => onScene(e.target.value)}
          className="rounded-md border border-border bg-bg-elev px-2 py-1 text-sm text-ink"
        >
          {SEED_SCENES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        Layer (Sdf)
        <select
          value={layerId}
          onChange={(e) => onLayer(e.target.value)}
          className="rounded-md border border-border bg-bg-elev px-2 py-1 text-sm text-ink"
        >
          {scene.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** .usda + tree side by side - for L0 (Sdf vs Usd). */
export function SdfVsUsdWidget() {
  const [sceneId, setSceneId] = useState(SEED_SCENES[0].id);
  const [layerId, setLayerId] = useState(SEED_SCENES[0].rootLayerId);
  const scene = SEED_SCENES.find((s) => s.id === sceneId)!;
  const layer = getLayer(scene, layerId) ?? scene.layers[0];
  const usda = useMemo(() => deriveUsda(layer), [layer]);
  const tree = useMemo(() => deriveTree(layer), [layer]);

  return (
    <div>
      <SceneLayerPicker
        sceneId={sceneId}
        layerId={layer.id}
        onScene={(id) => {
          setSceneId(id);
          setLayerId(SEED_SCENES.find((x) => x.id === id)!.rootLayerId);
        }}
        onLayer={setLayerId}
      />
      <p className="mb-3 text-xs text-ink-faint">{scene.description}</p>
      <div className="grid grid-cols-1 auto-rows-[56vh] gap-4 lg:h-[58vh] lg:auto-rows-auto lg:grid-cols-2">
        <UsdaPane source={usda} filename={layer.name} />
        <TreePane nodes={tree} />
      </div>
    </div>
  );
}

/** The scenegraph tree alone - for L1 (a small scenegraph explorer). */
export function ScenegraphWidget({ height = "44vh" }: { height?: string }) {
  const [sceneId, setSceneId] = useState(SEED_SCENES[0].id);
  const [layerId, setLayerId] = useState(SEED_SCENES[0].rootLayerId);
  const scene = SEED_SCENES.find((s) => s.id === sceneId)!;
  const layer = getLayer(scene, layerId) ?? scene.layers[0];
  const tree = useMemo(() => deriveTree(layer), [layer]);

  return (
    <div>
      <SceneLayerPicker
        sceneId={sceneId}
        layerId={layer.id}
        onScene={(id) => {
          setSceneId(id);
          setLayerId(SEED_SCENES.find((x) => x.id === id)!.rootLayerId);
        }}
        onLayer={setLayerId}
      />
      <div style={{ height }}>
        <TreePane nodes={tree} />
      </div>
    </div>
  );
}
