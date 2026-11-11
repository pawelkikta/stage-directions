import { useState } from "react";

/**
 * Contrast: a scalar attribute = winner-take-all (one opinion wins),
 * while LIST-EDITABLE fields (references, inherits, relationship targets, apiSchemas)
 * COMPOSE through prepend/append/delete. A common misconception.
 */
export function ListEditingWidget() {
  const [prependB, setPrependB] = useState(true);
  const [appendC, setAppendC] = useState(false);
  const [deleteA, setDeleteA] = useState(false);

  const base = deleteA ? [] : ["@A@"];
  const result = [
    ...(prependB ? ["@B@"] : []),
    ...base,
    ...(appendC ? ["@C@"] : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* winner-take-all */}
        <div className="rounded-lg border border-border bg-bg-panel p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-copper-bright">
            A scalar attribute → winner-take-all
          </p>
          <ul className="space-y-1 font-mono text-[13px] text-ink-muted">
            <li>weaker layer: <span className="text-ink">radius = 1</span></li>
            <li>stronger layer: <span className="text-ink">radius = 5</span></li>
          </ul>
          <p className="mt-2 border-t border-border pt-2 font-mono text-sm">
            result: <span className="text-gold-soft">radius = 5</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">
            One opinion wins (by LIVERPS). The rest is lost.
          </p>
        </div>

        {/* list-editing */}
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            A list (references) → list editing
          </p>
          <p className="mb-2 font-mono text-[12px] text-ink-faint">
            base: references = [@A@]
          </p>
          <div className="flex flex-col gap-1.5 text-[12px]">
            <label className="flex items-center gap-2 text-ink-muted">
              <input type="checkbox" checked={prependB} onChange={() => setPrependB((v) => !v)} className="accent-copper" />
              <span className="font-mono">prepend references = [@B@]</span>
            </label>
            <label className="flex items-center gap-2 text-ink-muted">
              <input type="checkbox" checked={appendC} onChange={() => setAppendC((v) => !v)} className="accent-copper" />
              <span className="font-mono">append references = [@C@]</span>
            </label>
            <label className="flex items-center gap-2 text-ink-muted">
              <input type="checkbox" checked={deleteA} onChange={() => setDeleteA((v) => !v)} className="accent-copper" />
              <span className="font-mono">delete references = [@A@]</span>
            </label>
          </div>
          <p className="mt-2 border-t border-border pt-2 font-mono text-sm">
            result:{" "}
            <span className="text-emerald-300">
              [{result.join(", ") || "empty"}]
            </span>
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">
            The opinions COMBINE, they do not override. prepend/append add, delete removes.
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        The key: “strongest wins” applies to <span className="text-copper-bright">attribute
        values</span>. But <span className="text-emerald-300">references, payloads,
        inherits, specializes, apiSchemas and relationship targets</span> are
        list-editable - they compose through prepend/append/delete/order.
      </p>
    </div>
  );
}
