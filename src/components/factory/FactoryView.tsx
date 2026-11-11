import { useEffect, useMemo, useRef, useState } from "react";

import { stepHash } from "../../core/factory/hash.ts";
import {
  BIN_POS,
  CAGE_POS,
  DISPLAY_POS,
  FEEDER_X,
  PAINTS,
  ROBOT_POS,
  WAREHOUSE_X,
  type Paint,
} from "../../core/factory/layout.ts";
import { FactorySim, type Features, type Params } from "../../core/factory/sim.ts";
import type { FactorySnapshot } from "../../core/factory/snapshot.ts";
import { FACTORY_STEPS as STEP_COUNT, factoryFiles, processText, sessionText, ROBOT_LIMITS } from "../../core/factory/usd.ts";
import { FACTORY_INTRO, FACTORY_STEPS } from "../../data/factory.ts";
import { FACTORY_VERIFIED } from "../../data/factory.verified.ts";
import { CodeBlock } from "../CodeBlock.tsx";
import { mdt } from "../md.tsx";
import { FactoryScene, type Label } from "./FactoryScene.ts";

const STEP_KEY = "usd-atlas:factory-step";

function readStep(): number {
  try {
    const n = Number(localStorage.getItem(STEP_KEY));
    return n >= 1 && n <= STEP_COUNT ? n : 1;
  } catch {
    return 1;
  }
}

function features(step: number): Features {
  return {
    belt: step >= 3,
    robot: step >= 4,
    paint: step >= 5,
    warehouse: step >= 5,
    sensors: step >= 6,
    test: step >= 9,
  };
}

function labels(step: number): Label[] {
  const l: Label[] = [];
  if (step >= 2) l.push({ text: "Sample", pos: [DISPLAY_POS[0], 1.55, DISPLAY_POS[2]] });
  if (step >= 3) l.push({ text: "Feeder", pos: [FEEDER_X, 1.75, 0] });
  if (step >= 4) l.push({ text: "Assembly", pos: [ROBOT_POS[0], 2.45, ROBOT_POS[2]] });
  if (step >= 5) {
    l.push({ text: "Paint shop", pos: [0, 2.55, 0] });
    l.push({ text: "Warehouse", pos: [WAREHOUSE_X, 1.2, -3.5] });
  }
  if (step >= 9) {
    l.push({ text: "Test flight", pos: [CAGE_POS[0], 2.75, CAGE_POS[2]] });
    l.push({ text: "Rejects", pos: [BIN_POS[0], 1.05, BIN_POS[2]] });
  }
  return l;
}

type Shot = { name: string; pos: [number, number, number]; target: [number, number, number] };

/** Camera shots in the twin - outside USD, only for viewing. */
function shots(step: number): Shot[] {
  const s: Shot[] = [];
  if (step >= 2) s.push({ name: "sample", pos: [-10.6, 1.6, -2.4], target: [DISPLAY_POS[0], 0.75, DISPLAY_POS[2]] });
  if (step >= 4) s.push({ name: "assembly", pos: [-3.4, 2.7, 2.4], target: [ROBOT_POS[0], 0.9, -0.5] });
  if (step >= 5) s.push({ name: "paint shop", pos: [2.6, 2.4, 3.4], target: [0, 1, 0] });
  if (step >= 9) s.push({ name: "test flight", pos: [7, 2.8, 4.6], target: [CAGE_POS[0], 1.3, 0.5] });
  if (step >= 5) s.push({ name: "warehouse", pos: [10.2, 3.2, 4.4], target: [WAREHOUSE_X, 0.3, 0] });
  return s;
}

/** The value of a parameter in one layer of the stack (for example process.usda under night_shift.usda). */
function inLayer(snap: FactorySnapshot, key: string, layer: string): number | undefined {
  const p = snap.params[key];
  if (!p) return undefined;
  const i = p.z.indexOf(layer);
  return i >= 0 ? Number(p.w[i]) : undefined;
}

interface Controls {
  takt: number;
  beltSpeed: number;
  /** Robot speed written by the slider (from step 7: in process.usda). */
  robotSpeed: number;
  mix: Record<Paint, number>;
  defectRate: number;
  robotFault: boolean;
  /** Step 8: is night_shift.usda active (not muted). */
  nightLayer: boolean;
}

function defaults(step: number, snap: FactorySnapshot): Controls {
  const v = (key: string, fallback: number) => Number(snap.params[key]?.v ?? fallback);
  return {
    takt: v("Line.factory:taktTime", 6),
    beltSpeed: v("Line.factory:beltSpeed", 0.5),
    robotSpeed: inLayer(snap, "Robot.factory:speed", "process.usda") ?? v("Robot.factory:speed", 1),
    mix: { gray: 1, red: 2, blue: 2, yellow: 1 },
    defectRate: step >= 9 ? 0.15 : 0,
    robotFault: false,
    nightLayer: step === 8,
  };
}

const NIGHT_VALUE = (snap: FactorySnapshot) => inLayer(snap, "Robot.factory:speed", "night_shift.usda") ?? 0.4;

function simParams(c: Controls, snap: FactorySnapshot, step: number): Params {
  return {
    takt: c.takt,
    beltSpeed: c.beltSpeed,
    robotSpeed: step === 8 && c.nightLayer ? NIGHT_VALUE(snap) : c.robotSpeed,
    paintSpeed: Number(snap.params["PaintShop.factory:speed"]?.v ?? 1),
    mix: c.mix,
    defectRate: c.defectRate,
    robotFault: c.robotFault,
  };
}

/* ------------------------------------------------------------ 3D view --- */

interface Stats {
  time: number;
  ok: number;
  nok: number;
  perHour: number;
  queue: number;
  shipped: number;
  util: { assembly: number; paint: number; test: number };
  sensors: FactorySim["sensors"];
}

function Viewport({
  step,
  snap,
  controls,
  running,
  speed,
  resetKey,
  onStats,
}: {
  step: number;
  snap: FactorySnapshot;
  controls: Controls;
  running: boolean;
  speed: number;
  resetKey: number;
  onStats: (s: Stats) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FactoryScene | null>(null);
  const live = useRef({ controls, running, speed });
  live.current = { controls, running, speed };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let scene: FactoryScene;
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim() || "#0b0e15";
      scene = new FactoryScene(host.current, snap, bg, labels(step));
      sceneRef.current = scene;
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const limits = snap.limits
      ? {
          j1: snap.limits.J1_Swivel ?? ROBOT_LIMITS.j1,
          j2: snap.limits.J2_Arm ?? ROBOT_LIMITS.j2,
          j3: snap.limits.J3_Elbow ?? ROBOT_LIMITS.j3,
          j4: snap.limits.J4_Gripper ?? ROBOT_LIMITS.j4,
        }
      : ROBOT_LIMITS;
    const sim = new FactorySim(features(step), limits, step >= 5 ? 8 : 0);
    let raf = 0;
    let last = performance.now();
    let lastStats = 0;
    const tick = (now: number) => {
      const real = Math.min((now - last) / 1000, 0.1);
      last = now;
      const { running: on, speed: k, controls: c } = live.current;
      const simDt = on ? real * k : 0;
      const params = simParams(c, snap, step);
      const steps = Math.ceil(simDt / (1 / 60));
      for (let i = 0; i < steps; i++) sim.step(simDt / steps, params);
      scene.sync(sim, simDt, real, step >= 5);
      if (now - lastStats > 250) {
        lastStats = now;
        onStats({
          time: sim.time,
          ok: sim.ok,
          nok: sim.nok,
          perHour: sim.perHour,
          queue: sim.queue(),
          shipped: sim.shipped,
          util: {
            assembly: sim.utilization("assembly"),
            paint: sim.utilization("paint"),
            test: sim.utilization("test"),
          },
          sensors: JSON.parse(JSON.stringify(sim.sensors)),
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      sceneRef.current = null;
      scene.dispose();
    };
    // a new scene on a step change or after "restart"
  }, [step, snap, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-code sm:aspect-[16/9]">
      <div ref={host} className="absolute inset-0" />
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
        {[{ name: "whole hall", pos: null, target: null }, ...shots(step)].map((s) => (
          <button
            key={s.name}
            onClick={() =>
              s.pos ? sceneRef.current?.focus(s.pos, s.target!) : sceneRef.current?.resetCamera(snap)
            }
            className="rounded bg-black/55 px-2 py-0.5 text-[11px] text-ink-muted backdrop-blur hover:bg-black/75 hover:text-ink"
          >
            {s.name}
          </button>
        ))}
      </div>
      {error && (
        <p className="absolute inset-x-4 top-4 rounded bg-red-900/40 p-3 text-sm text-ink">
          Could not start the 3D view (WebGL): {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------- side panel --- */

function Slider({
  label,
  source,
  value,
  min,
  max,
  step,
  unit,
  disabledNote,
  onChange,
}: {
  label: string;
  source?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabledNote?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-gold-soft">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--color-copper)]"
      />
      {source && <span className="block text-[11px] text-ink-faint">{source}</span>}
      {disabledNote && <span className="block text-[11px] text-red-300">{disabledNote}</span>}
    </label>
  );
}

function Bar({ label, value, hot }: { label: string; value: number; hot: boolean }) {
  return (
    <div className="text-xs">
      <div className="flex justify-between">
        <span className={hot ? "text-gold-soft" : "text-ink-muted"}>{label}</span>
        <span className="font-mono text-ink-muted">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-bg-elev">
        <div
          className={`h-full rounded ${hot ? "bg-copper-bright" : "bg-copper/60"}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

const STATE_CLASS = { running: "text-emerald-300", idle: "text-amber-300", fault: "text-red-300" };

/* --------------------------------------------------------------- view --- */

export function FactoryView() {
  const [step, setStepState] = useState(readStep);
  const verified = FACTORY_VERIFIED[step - 1];
  const snap = verified.snapshot;
  const info = FACTORY_STEPS[step - 1];
  const files = useMemo(() => factoryFiles(step), [step]);
  const prevFiles = useMemo(() => (step > 1 ? factoryFiles(step - 1) : {}), [step]);
  const matches = verified.hash === stepHash(files, info.check);

  const [controls, setControls] = useState<Controls>(() => defaults(step, snap));
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [resetKey, setResetKey] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shown, setShown] = useState(false);

  const changed = Object.keys(files).filter((f) => files[f] !== prevFiles[f]);
  const [openFile, setOpenFile] = useState<string>(changed[0] ?? "factory.usda");

  const setStep = (n: number) => {
    const s = Math.max(1, Math.min(STEP_COUNT, n));
    setStepState(s);
    try {
      localStorage.setItem(STEP_KEY, String(s));
    } catch {
      /* no step memory */
    }
  };

  // a new step: parameters from the USD snapshot, the first new file open
  useEffect(() => {
    setControls(defaults(step, snap));
    setShown(false);
    setStats(null);
    const next = Object.keys(files).filter((f) => files[f] !== prevFiles[f]);
    setOpenFile(next[0] ?? "factory.usda");
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Controls>(k: K, v: Controls[K]) => setControls((c) => ({ ...c, [k]: v }));
  const effectiveRobot = step === 8 && controls.nightLayer ? NIGHT_VALUE(snap) : controls.robotSpeed;
  const f = features(step);
  const source = (layerNote: string, schemaNote: string) =>
    step >= 7 ? layerNote : step === 6 ? schemaNote : "twin parameter";

  const bottleneck =
    stats && f.robot
      ? (Object.entries(stats.util) as [keyof Stats["util"], number][]).sort((a, b) => b[1] - a[1])[0]
      : null;
  const stationName = { assembly: "Assembly", paint: "Paint shop", test: "Test flight" };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-8">
      <header className="mb-6">
        <p className="caps text-gold-soft">Final project · uses every chapter</p>
        <h1 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[38px]">Drone Factory</h1>
        <div className="mt-3 max-w-[72ch] space-y-2 text-[15px] leading-relaxed text-ink-muted">
          {FACTORY_INTRO.split("\n").map((p, i) => (
            <p key={i}>{mdt(p)}</p>
          ))}
        </div>
      </header>

      {/* step bar */}
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Factory build steps">
        {FACTORY_STEPS.map((s, i) => (
          <button
            key={s.short}
            onClick={() => setStep(i + 1)}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper ${
              step === i + 1
                ? "border-copper/60 bg-copper/20 text-gold-soft"
                : i + 1 < step
                  ? "border-border bg-bg-panel text-ink-muted hover:text-ink"
                  : "border-border bg-bg text-ink-faint hover:text-ink-muted"
            }`}
          >
            <span className="font-mono">{i + 1}</span> {s.short}
          </button>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">
              <span className="font-mono text-copper-bright">{step}.</span> {info.title}
            </h2>
            <span className="text-xs text-ink-faint">{info.concept}</span>
          </div>
          {!matches && (
            <p className="mb-2 rounded border border-red-700/40 bg-red-900/10 p-2 text-xs text-ink-muted">
              {mdt("The step files changed after verification - run `npm run verify:factory`.")}
            </p>
          )}
          <Viewport
            step={step}
            snap={snap}
            controls={controls}
            running={running}
            speed={speed}
            resetKey={resetKey}
            onStats={setStats}
          />
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{mdt(info.twin)}</p>
        </div>

        <aside className="flex flex-col gap-3">
          {/* simulation time */}
          <section className="rounded-lg border border-border bg-bg-panel p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded border border-copper/40 bg-copper/10 px-2.5 py-1 text-xs text-gold-soft hover:bg-copper/20"
              >
                {running ? "pause" : "start"}
              </button>
              {[1, 2, 4, 8].map((k) => (
                <button
                  key={k}
                  onClick={() => setSpeed(k)}
                  aria-pressed={speed === k}
                  className={`rounded border px-2 py-1 font-mono text-[11px] ${
                    speed === k ? "border-copper/60 bg-copper/20 text-gold-soft" : "border-border text-ink-faint"
                  }`}
                >
                  {k}x
                </button>
              ))}
              <button
                onClick={() => {
                  setResetKey((k) => k + 1);
                  setStats(null);
                }}
                className="ml-auto rounded border border-border px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
              >
                restart
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">
              shift time: <span className="font-mono">{formatTime(stats?.time ?? 0)}</span> · drag the view with the mouse,
              the wheel zooms
            </p>
          </section>

          {/* parameters */}
          {f.belt && (
            <section className="flex flex-col gap-3 rounded-lg border border-border bg-bg-panel p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Line parameters</h3>
              <Slider
                label="feeder takt time"
                source={source("factory:taktTime in process.usda", "factory:taktTime - schema: 6 s")}
                value={controls.takt}
                min={2}
                max={12}
                step={0.5}
                unit="s"
                onChange={(v) => set("takt", v)}
              />
              <Slider
                label="belt speed"
                source={source("factory:beltSpeed in process.usda", "factory:beltSpeed - schema: 0.5 m/s")}
                value={controls.beltSpeed}
                min={0.2}
                max={1.5}
                step={0.05}
                unit="m/s"
                onChange={(v) => set("beltSpeed", v)}
              />
              {f.robot && (
                <Slider
                  label="robot speed"
                  source={source("the robot's factory:speed in process.usda", "factory:speed - schema: 1")}
                  value={controls.robotSpeed}
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  unit="x"
                  disabledNote={
                    step === 8 && controls.nightLayer
                      ? `on the stage: ${effectiveRobot} - the stronger night_shift.usda`
                      : undefined
                  }
                  onChange={(v) => set("robotSpeed", v)}
                />
              )}
              {step === 8 && (
                <label className="flex items-start gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={controls.nightLayer}
                    onChange={(e) => set("nightLayer", e.target.checked)}
                    className="mt-0.5 accent-[var(--color-copper)]"
                  />
                  <span>
                    <span className="font-mono">night_shift.usda</span> active
                    <span className="block text-[11px] text-ink-faint">untick = stage.MuteLayer(...)</span>
                  </span>
                </label>
              )}
              {step >= 8 && (
                <button
                  onClick={() => set("robotFault", !controls.robotFault)}
                  className={`rounded border px-2 py-1.5 text-xs ${
                    controls.robotFault
                      ? "border-red-700/60 bg-red-900/30 text-red-200"
                      : "border-border text-ink-muted hover:text-ink"
                  }`}
                >
                  {controls.robotFault ? "clear the robot fault" : "robot fault (session: state = fault)"}
                </button>
              )}
              {f.test && (
                <Slider
                  label="robot drops a rotor"
                  source="test scenario - outside USD"
                  value={controls.defectRate * 100}
                  min={0}
                  max={50}
                  step={1}
                  unit="%"
                  onChange={(v) => set("defectRate", v / 100)}
                />
              )}
              {f.paint && (
                <div>
                  <p className="text-xs text-ink-muted">orders (paint variant)</p>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {PAINTS.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                        <span className="w-14">{p}</span>
                        <input
                          type="range"
                          min={0}
                          max={4}
                          step={1}
                          value={controls.mix[p]}
                          onChange={(e) => set("mix", { ...controls.mix, [p]: Number(e.target.value) })}
                          className="w-full accent-[var(--color-copper)]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* indicators */}
          {f.belt && stats && (
            <section className="rounded-lg border border-border bg-bg-panel p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Shift result</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Kpi label="drones/h" value={stats.time < 30 ? "-" : Math.round(stats.perHour).toString()} />
                <Kpi label="finished" value={String(stats.ok)} />
                <Kpi label={f.test ? "rejects" : "in queue"} value={String(f.test ? stats.nok : stats.queue)} />
              </div>
              {f.robot && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <Bar label="Assembly" value={stats.util.assembly} hot={bottleneck?.[0] === "assembly"} />
                  {f.paint && <Bar label="Paint shop" value={stats.util.paint} hot={bottleneck?.[0] === "paint"} />}
                  {f.test && <Bar label="Test flight" value={stats.util.test} hot={bottleneck?.[0] === "test"} />}
                  {bottleneck && stats.queue >= 3 && (
                    <p className="text-[11px] text-gold-soft">
                      bottleneck: {stationName[bottleneck[0]]} ({stats.queue} in queue)
                    </p>
                  )}
                  {stats.shipped > 0 && <p className="text-[11px] text-ink-faint">pallets shipped: {stats.shipped} drones</p>}
                </div>
              )}
            </section>
          )}

          {/* sensors */}
          {f.sensors && stats && (
            <section className="rounded-lg border border-border bg-bg-panel p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Sensors (FactoryMachineAPI)
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  {(
                    [
                      ["Robot", stats.sensors.robot],
                      ["Paint shop", stats.sensors.paintShop],
                      ...(f.test ? [["Test cage", stats.sensors.testCage] as const] : []),
                    ] as const
                  ).map(([name, s]) => (
                    <tr key={name}>
                      <td className="py-0.5 text-ink-muted">{name}</td>
                      <td className={`font-mono ${STATE_CLASS[s.state]}`}>{s.state}</td>
                      <td className="text-right font-mono text-ink-muted">{s.temperature.toFixed(1)}°C</td>
                      <td className="text-right font-mono text-ink-faint">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </aside>
      </div>

      {/* step content */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-base font-bold text-gold-soft">What we build</h3>
          {info.md.map((p, i) => (
            <p key={i} className="mb-3 text-[15px] leading-[1.7] text-ink-muted">
              {mdt(p)}
            </p>
          ))}
        </div>
        <div>
          <h3 className="mb-2 text-base font-bold text-gold-soft">Files after this step</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(files).map((name) => {
              const state = !(name in prevFiles) ? "new" : files[name] !== prevFiles[name] ? "changed" : "";
              return (
                <button
                  key={name}
                  onClick={() => setOpenFile(name)}
                  aria-pressed={openFile === name}
                  className={`rounded border px-2 py-1 font-mono text-[11px] ${
                    openFile === name
                      ? "border-copper/60 bg-copper/20 text-gold-soft"
                      : state
                        ? "border-copper/30 text-ink-muted hover:text-ink"
                        : "border-border text-ink-faint hover:text-ink-muted"
                  }`}
                >
                  {name}
                  {state && <span className="ml-1 font-sans text-[10px] text-copper-bright">{state}</span>}
                </button>
              );
            })}
          </div>
          {files[openFile] && (
            <CodeBlock
              code={files[openFile]}
              label={openFile}
              lang={openFile.endsWith(".json") ? "json" : "usda"}
            />
          )}
        </div>
      </section>

      {step >= 7 && (
        <section className="mt-6 rounded-lg border border-border bg-bg-panel p-4">
          <h3 className="mb-1 text-base font-bold text-gold-soft">Live layers</h3>
          <p className="mb-2 text-sm text-ink-muted">
            {mdt(
              "The sliders write to the process engineer's layer, the sensors - to the session layer. `Save()` would keep " +
                "only the first one.",
            )}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <CodeBlock
              code={processText({ takt: controls.takt, beltSpeed: controls.beltSpeed, robotSpeed: controls.robotSpeed })}
              label="process.usda"
              lang="usda"
            />
            <CodeBlock
              code={sessionText(
                (["Robot", "PaintShop", ...(f.test ? ["TestCage"] : [])] as const).map((name) => ({
                  name,
                  // before the first frame: the default values from the schema
                  ...(stats?.sensors[name === "Robot" ? "robot" : name === "PaintShop" ? "paintShop" : "testCage"] ?? {
                    state: "idle",
                    temperature: 20,
                    count: 0,
                  }),
                })),
              )}
              label="session layer (never goes to a file)"
              lang="usda"
            />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-bg-panel p-4">
        <h3 className="mb-1 text-base font-bold text-gold-soft">Check on real USD</h3>
        <p className="mb-2 text-sm text-ink-muted">
          {mdt(
            "Save the step files in one folder (or unpack the `.usdz` from step 9) and run the script in a console with USD, as in the Lab.",
          )}
        </p>
        <CodeBlock code={info.check} label="check.py" lang="python" />
        {shown ? (
          <>
            <CodeBlock code={verified.output} label="Output (USD 25.08)" tone="output" />
            <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(info.why)}</p>
          </>
        ) : (
          <button
            onClick={() => setShown(true)}
            className="my-2 w-full rounded-lg border border-dashed border-copper/50 bg-bg px-4 py-3 text-left hover:border-copper hover:bg-copper/5"
          >
            <span className="block text-sm font-semibold text-gold-soft">What will it print? Guess, then show</span>
            <span className="mt-0.5 block text-xs text-ink-faint">
              Predict the result first, then compare - this is the fastest way to find gaps.
            </span>
          </button>
        )}
      </section>

      {step === STEP_COUNT && (
        <section className="mt-6 grid gap-4 rounded-lg border border-gold/30 bg-gold/5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-1 text-base font-bold text-gold-soft">The factory in one file</h3>
            <p className="mb-3 text-sm leading-relaxed text-ink-muted">
              {mdt(
                "The package was made in step 9 (`UsdUtils.CreateNewUsdzPackage`). Open it in usdview: " +
                  "`usdview factory.usdz`. Next to it is a `usdrecord` render from the camera written in the scene - the same " +
                  "folder, a different renderer (Storm), no twin.",
              )}
            </p>
            <a
              href={`${import.meta.env.BASE_URL}factory/factory.usdz`}
              download
              className="inline-block rounded border border-copper/50 bg-copper/15 px-3 py-1.5 text-sm text-gold-soft hover:bg-copper/25"
            >
              download factory.usdz
            </a>
          </div>
          <figure>
            <img
              src={`${import.meta.env.BASE_URL}renders/factory-usdrecord.png`}
              alt="usdrecord render of the whole factory: belt, robot, paint shop, test cage and a warehouse with colored drones."
              loading="lazy"
              className="w-full rounded-lg border border-border"
            />
            <figcaption className="mt-1 text-xs text-ink-faint">
              {mdt("`usdrecord --camera /Factory/Camera factory.usda`")}
            </figcaption>
          </figure>
        </section>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="rounded border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30"
        >
          ← previous step
        </button>
        <button
          onClick={() => setStep(step + 1)}
          disabled={step === STEP_COUNT}
          className="rounded border border-copper/50 bg-copper/15 px-3 py-1.5 text-sm text-gold-soft hover:bg-copper/25 disabled:opacity-30"
        >
          next step →
        </button>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-bg p-1.5">
      <div className="font-mono text-base text-gold-soft">{value}</div>
      <div className="text-[10px] text-ink-faint">{label}</div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
