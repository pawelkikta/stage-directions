import type { Step } from "../../state/useAppStore.ts";

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Line icons for the four chapter steps. */
export function StepIcon({ step }: { step: Step }) {
  switch (step) {
    case "learn": // open book
      return (
        <svg {...base}>
          <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
          <path d="M12 6.3v13" />
        </svg>
      );
    case "predict": // eye
      return (
        <svg {...base}>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "check": // checklist
      return (
        <svg {...base}>
          <rect x="3.5" y="4" width="17" height="16" />
          <path d="M7 9l1.5 1.5L11 8M7 15l1.5 1.5L11 14M13.5 9.5H17M13.5 15.5H17" />
        </svg>
      );
    case "run": // terminal prompt
      return (
        <svg {...base}>
          <rect x="3" y="4.5" width="18" height="15" />
          <path d="M7 10l3 2.5L7 15M12.5 15H17" />
        </svg>
      );
  }
}

export function ArrowRight() {
  return (
    <svg {...base} width={18} height={18}>
      <path d="M4 12h15M14 7l5 5-5 5" />
    </svg>
  );
}

export function ArrowLeft() {
  return (
    <svg {...base} width={18} height={18}>
      <path d="M20 12H5M10 7l-5 5 5 5" />
    </svg>
  );
}
