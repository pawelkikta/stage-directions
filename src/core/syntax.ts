/* ===========================================================================
 * A light syntax highlighter: USDA, Python, JSON, console.
 *
 * No popular library knows .usda, and it is the main language of the app - so
 * a custom regex scanner. It returns tokens with a kind; the colors live in CSS
 * (.syn-*), so each theme has its own palette.
 * ======================================================================== */

export type Lang = "usda" | "python" | "json" | "shell" | "plain";

export type TokKind =
  | "text"
  | "comment"
  | "meta"
  | "keyword"
  | "modifier"
  | "type"
  | "cls"
  | "attr"
  | "prop"
  | "string"
  | "asset"
  | "path"
  | "number"
  | "func"
  | "const";

export interface Tok {
  t: string;
  k: TokKind;
}

const set = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const USDA_SPECIFIERS = set("def over class");
const USDA_MODIFIERS = set("prepend append delete add reorder uniform custom rel variantSet config");
const USDA_TYPES = set(
  "bool uchar int uint int64 uint64 half float double string token asset timecode dictionary opaque " +
    "matrix2d matrix3d matrix4d quatd quatf quath frame4d " +
    "int2 int3 int4 half2 half3 half4 float2 float3 float4 double2 double3 double4 " +
    "point3h point3f point3d vector3h vector3f vector3d normal3h normal3f normal3d " +
    "color3h color3f color3d color4h color4f color4d texCoord2h texCoord2f texCoord2d texCoord3f",
);
const USDA_META = set(
  "references payload inherits specializes subLayers variants variantSets kind defaultPrim apiSchemas " +
    "instanceable active doc documentation metersPerUnit upAxis startTimeCode endTimeCode " +
    "timeCodesPerSecond interpolation elementSize allowedTokens customData hidden relocates",
);

const PY_KEYWORDS = set(
  "and as assert async await break class continue def del elif else except finally for from global " +
    "if import in is lambda nonlocal not or pass raise return try while with yield",
);
const PY_CONST = set("True False None");

interface Rule {
  re: RegExp;
  kind: TokKind | ((m: string, ctx: Ctx) => TokKind);
}

interface Ctx {
  /** The kind of the last token that is not whitespace. */
  prev: TokKind | null;
  prevText: string;
  /** The text after the current token - to check for `(` or `:`. */
  rest: string;
  /** Is this the first word on the line. */
  lineStart: boolean;
}

const WS = /\s+/y;

function scan(code: string, rules: Rule[]): Tok[] {
  const out: Tok[] = [];
  const ctx: Ctx = { prev: null, prevText: "", rest: "", lineStart: true };
  let i = 0;
  const push = (t: string, k: TokKind) => {
    const last = out[out.length - 1];
    if (last && last.k === k) last.t += t;
    else out.push({ t, k });
  };
  outer: while (i < code.length) {
    WS.lastIndex = i;
    const ws = WS.exec(code);
    if (ws) {
      push(ws[0], "text");
      if (ws[0].includes("\n")) ctx.lineStart = true;
      i += ws[0].length;
      continue;
    }
    for (const r of rules) {
      r.re.lastIndex = i;
      const m = r.re.exec(code);
      if (m && m[0].length) {
        ctx.rest = code.slice(i + m[0].length, i + m[0].length + 40);
        const kind = typeof r.kind === "function" ? r.kind(m[0], ctx) : r.kind;
        push(m[0], kind);
        ctx.prev = kind;
        ctx.prevText = m[0];
        ctx.lineStart = false;
        i += m[0].length;
        continue outer;
      }
    }
    push(code[i], "text");
    ctx.prev = "text";
    ctx.prevText = code[i];
    ctx.lineStart = false;
    i++;
  }
  return out;
}

const NUMBER = /-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?(?![\w.])/y;

function usdaWord(w: string, ctx: Ctx): TokKind {
  if (USDA_SPECIFIERS.has(w)) return "keyword";
  if (USDA_MODIFIERS.has(w)) return "modifier";
  if (USDA_TYPES.has(w)) return "type";
  if (w === "true" || w === "false" || w === "None") return "const";
  if (ctx.prev === "keyword" && USDA_SPECIFIERS.has(ctx.prevText)) return "cls";
  if (USDA_META.has(w) && /^\s*=/.test(ctx.rest)) return "prop";
  if (w.includes(":") || ctx.prev === "type" || /^\s*(=|\.(connect|timeSamples))/.test(ctx.rest)) return "attr";
  return "text";
}

const USDA_RULES: Rule[] = [
  { re: /#usda[^\n]*/y, kind: "meta" },
  { re: /#[^\n]*/y, kind: "comment" },
  { re: /"""[\s\S]*?"""/y, kind: "string" },
  { re: /"(?:[^"\\\n]|\\.)*"/y, kind: "string" },
  { re: /@[^@\n]*@/y, kind: "asset" },
  { re: /<\/?[A-Za-z_][^<>\n]*>/y, kind: "path" },
  { re: /\.(?:connect|timeSamples)\b/y, kind: "modifier" },
  { re: NUMBER, kind: "number" },
  { re: /[A-Za-z_]\w*(?::\w+)*/y, kind: usdaWord },
];

const PY_RULES: Rule[] = [
  { re: /#[^\n]*/y, kind: "comment" },
  { re: /[rbfRBF]{0,2}(?:'''[\s\S]*?'''|"""[\s\S]*?""")/y, kind: "string" },
  { re: /[rbfRBF]{0,2}(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/y, kind: "string" },
  { re: NUMBER, kind: "number" },
  {
    re: /[A-Za-z_]\w*/y,
    kind: (w, ctx) => {
      if (PY_CONST.has(w)) return "const";
      if (PY_KEYWORDS.has(w)) return "keyword";
      if (ctx.prevText === "def" || ctx.prevText === "class") return "func";
      // in pxr, methods are PascalCase (GetPrimAtPath) - a call is always a function
      if (/^\s*\(/.test(ctx.rest)) return "func";
      if (/^[A-Z]/.test(w)) return "cls";
      return "text";
    },
  },
];

const JSON_RULES: Rule[] = [
  { re: /"(?:[^"\\\n]|\\.)*"/y, kind: (_m, ctx) => (/^\s*:/.test(ctx.rest) ? "prop" : "string") },
  { re: NUMBER, kind: "number" },
  { re: /\b(?:true|false|null|True|False|None)\b/y, kind: "const" },
  { re: /[A-Za-z_]\w*/y, kind: "text" },
];

const SHELL_RULES: Rule[] = [
  { re: /(?:REM\b|::|#)[^\n]*/y, kind: "comment" },
  { re: /"(?:[^"\\\n]|\\.)*"|'[^'\n]*'/y, kind: "string" },
  { re: /%[A-Za-z_]\w*%|\$\{?[A-Za-z_]\w*\}?/y, kind: "const" },
  { re: /--?[A-Za-z][\w-]*/y, kind: "prop" },
  { re: NUMBER, kind: "number" },
  {
    re: /[A-Za-z_][\w.\\/:-]*/y,
    kind: (w, ctx) => {
      if (/^(call|set|if|cd|echo|export|for|do|done|then|fi)$/i.test(w)) return "keyword";
      if (ctx.lineStart || ctx.prevText === "call") return "func";
      return "text";
    },
  },
];

/** Guesses the language from the content. Text that looks like nothing stays `plain`. */
export function detectLang(code: string): Lang {
  const s = code.trimStart();
  if (/^[{[]/.test(s) && /"\s*:/.test(s)) return "json";
  if (
    /^\s*(from\s+\w+\s+import|import\s+\w+)|\bprint\(|\b(Usd|Sdf|Gf|Vt|Tf|Kind|Plug|Ar)\w*\.\w+|\b[a-z_]\w*\.[A-Z]\w*\(/m.test(code)
  )
    return "python";
  if (
    /^#usda|^\s*(def|over|class)\b[^\n]*"[^"]*"|@[^@\n]+@|prepend \w+ =|\.(connect|timeSamples)\s*=|^\s*(uniform\s+)?[a-z]\w*(\[\])?\s+[\w]+:[\w:]+\s*=/m.test(code)
  )
    return "usda";
  if (/^\s*(call |set |usdrecord|usdview|usdcat|usdchecker|usdzip|python |pip |cd |mkdir )/m.test(code)) return "shell";
  return "plain";
}

/** '''#usda ...''' in a Python script: the quotes stay a string, the inside is USDA. */
function embeddedUsda(tok: Tok): Tok[] {
  if (tok.k !== "string") return [tok];
  const m = tok.t.match(/^([rbfRBF]{0,2}(?:'''|"""))(#usda[\s\S]*)('''|""")$/);
  if (!m) return [tok];
  return [{ t: m[1], k: "string" }, ...scan(m[2], USDA_RULES), { t: m[3], k: "string" }];
}

export function tokenize(code: string, lang: Lang = detectLang(code)): Tok[] {
  switch (lang) {
    case "usda":
      return scan(code, USDA_RULES);
    case "python":
      return scan(code, PY_RULES).flatMap(embeddedUsda);
    case "json":
      return scan(code, JSON_RULES);
    case "shell":
      return scan(code, SHELL_RULES);
    default:
      return [{ t: code, k: "text" }];
  }
}

/** Tokens cut into lines - for views that decorate single lines. */
export function tokenizeLines(code: string, lang?: Lang): Tok[][] {
  const lines: Tok[][] = [[]];
  for (const tok of tokenize(code, lang)) {
    const parts = tok.t.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ t: p, k: tok.k });
    });
  }
  return lines;
}
