import { Highlight } from "../Highlight.tsx";

interface Fmt {
  ext: string;
  tag: string;
  tagClass: string;
  oneLiner: string;
  use: string;
}

const FORMATS: Fmt[] = [
  {
    ext: ".usda",
    tag: "text (ASCII)",
    tagClass: "bg-emerald-900/30 text-emerald-300",
    oneLiner: "Human-readable. You open and edit it in any editor.",
    use: "Debugging, editing by hand, small files and overrides.",
  },
  {
    ext: ".usdc",
    tag: "binary (crate)",
    tagClass: "bg-sky-900/30 text-sky-300",
    oneLiner: "A compact binary 'crate' format. Fast loading and random access.",
    use: "Big data (geometry), performance. Not readable in an editor.",
  },
  {
    ext: ".usd",
    tag: "either",
    tagClass: "bg-violet-900/30 text-violet-300",
    oneLiner: "A generic extension - underneath it is ASCII OR crate. USD detects it from the header.",
    use: "When you want to switch the encoding (text↔binary) without changing references.",
  },
  {
    ext: ".usdz",
    tag: "package (ZIP)",
    tagClass: "bg-amber-900/30 text-amber-300",
    oneLiner:
      "An uncompressed, unencrypted archive that packs .usd + dependencies (textures) into one file.",
    use: "Distribution, AR, delivering an asset as one package. In practice read-only.",
  },
];

export function FileFormatsWidget() {
  return (
    <div>
      <div className="mb-4 rounded-lg border border-copper/30 bg-copper/5 p-3 text-[13px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-gold-soft">USD / OpenUSD</span> is a{" "}
        <span className="text-ink">scene description system</span> (and a family of formats), not
        one file type. <span className="text-ink">OpenUSD</span> is the name of the
        open-source project. The extensions below are different ways of{" "}
        <span className="text-ink">writing the same scene data</span>.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <div key={f.ext} className="rounded-lg border border-border bg-bg-panel p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-mono text-base font-bold text-copper-bright">
                {f.ext}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${f.tagClass}`}>
                {f.tag}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-muted">{f.oneLiner}</p>
            <p className="mt-1.5 text-[12px] text-ink-faint">
              <span className="text-ink-muted">When:</span> {f.use}
            </p>
          </div>
        ))}
      </div>

      {/* the same content, a different encoding */}
      <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-ink-faint">
        The same content, a different encoding (.usda vs .usdc)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-emerald-700/30 bg-code">
          <div className="border-b border-border px-3 py-1.5 text-[11px] text-emerald-300">
            .usda - text
          </div>
          <pre className="overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink">
            <Highlight lang="usda" code={`def Sphere "Ball"
{
    double radius = 2
}`} />
          </pre>
        </div>
        <div className="overflow-hidden rounded-lg border border-sky-700/30 bg-code">
          <div className="border-b border-border px-3 py-1.5 text-[11px] text-sky-300">
            .usdc - binary (crate)
          </div>
          <pre className="overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink-faint">
{`50 58 52 2D 55 53 44 43
00 08 02 00 00 ... (crate)
# the same data, a binary
# format - not readable`}
          </pre>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        The key for the exam: <span className="text-copper-bright">.usd</span> does not say whether it is
        text or binary - <span className="text-copper-bright">.usda</span> is text and{" "}
        <span className="text-copper-bright">.usdc</span> is crate. And{" "}
        <span className="text-copper-bright">.usdz</span> is a package, not another encoding of a single layer.
      </p>
    </div>
  );
}
