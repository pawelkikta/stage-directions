/* ===========================================================================
 * Global app state (zustand) + navigation WITHOUT react-router.
 * Chapter = view `layer:N`, chapter step = `step`.
 * ======================================================================== */
import { create } from "zustand";

export type View =
  | "home"
  | "concept-map"
  | "glossary"
  | "quiz"
  | "lab"
  | "factory"
  | "about"
  | `layer:${number}`; // layer:0 .. layer:7

/** The four steps every chapter has. */
export type Step = "learn" | "predict" | "check" | "run";

export type Theme = "paper" | "blueprint";

const THEME_KEY = "usd-atlas:theme";
const LAST_KEY = "usd-atlas:last";

/** Theme is set by the script in index.html; here we only read it. */
const initialTheme = (): Theme =>
  typeof document !== "undefined" && document.documentElement.dataset.theme === "blueprint"
    ? "blueprint"
    : "paper";

export interface LastPosition {
  chapter: number;
  step: Step;
}

export function loadLast(): LastPosition | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LastPosition;
    return typeof v.chapter === "number" && typeof v.step === "string" ? v : null;
  } catch {
    return null;
  }
}

function saveLast(v: LastPosition) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v));
  } catch {
    /* without storage "continue" just starts from chapter 0 */
  }
}

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  view: View;
  /** Old links ("→ lesson") land on the Learn step. */
  setView: (v: View) => void;
  step: Step;
  setStep: (s: Step) => void;
  goChapter: (chapter: number, step?: Step) => void;
  /** ConceptGraph node to highlight after opening the Concept Map. */
  focusConcept: string | null;
  setFocusConcept: (id: string | null) => void;
  /** The slide-out glossary next to the lesson. */
  glossaryOpen: boolean;
  /** The entry to expand and scroll to after opening (a term from GLOSSARY). */
  glossaryFocus: string | null;
  openGlossary: (term?: string) => void;
  closeGlossary: () => void;
  toggleGlossary: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    if (theme === "blueprint") document.documentElement.dataset.theme = "blueprint";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* without storage the theme just does not survive a reload */
    }
    set({ theme });
  },
  view: "home",
  setView: (view) => {
    if (view.startsWith("layer:")) get().goChapter(Number(view.split(":")[1]), "learn");
    else set({ view });
  },
  step: "learn",
  setStep: (step) => {
    const v = get().view;
    if (v.startsWith("layer:")) saveLast({ chapter: Number(v.split(":")[1]), step });
    set({ step });
  },
  goChapter: (chapter, step = "learn") => {
    saveLast({ chapter, step });
    set({ view: `layer:${chapter}`, step });
  },
  focusConcept: null,
  setFocusConcept: (focusConcept) => set({ focusConcept }),
  glossaryOpen: false,
  glossaryFocus: null,
  openGlossary: (term) => set({ glossaryOpen: true, glossaryFocus: term ?? null }),
  closeGlossary: () => set({ glossaryOpen: false }),
  toggleGlossary: () => set((s) => ({ glossaryOpen: !s.glossaryOpen, glossaryFocus: null })),
}));
