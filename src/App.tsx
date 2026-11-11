import { lazy, Suspense, useEffect, useRef } from "react";
import { TopBar } from "./components/shell/TopBar.tsx";
import { GlossaryDrawer } from "./components/GlossaryDrawer.tsx";
import { useAppStore } from "./state/useAppStore.ts";

// Every view is loaded lazily, so the first paint needs only the top bar.
const HomeView = lazy(() => import("./components/HomeView.tsx").then((m) => ({ default: m.HomeView })));
const ChapterView = lazy(() =>
  import("./components/chapter/ChapterView.tsx").then((m) => ({ default: m.ChapterView })),
);
const ConceptMapView = lazy(() =>
  import("./components/ConceptMapView.tsx").then((m) => ({ default: m.ConceptMapView })),
);
const GlossaryView = lazy(() => import("./components/GlossaryView.tsx").then((m) => ({ default: m.GlossaryView })));
const QuizView = lazy(() => import("./components/QuizView.tsx").then((m) => ({ default: m.QuizView })));
const LabView = lazy(() => import("./components/LabView.tsx").then((m) => ({ default: m.LabView })));
const FactoryView = lazy(() =>
  import("./components/factory/FactoryView.tsx").then((m) => ({ default: m.FactoryView })),
);
const AboutView = lazy(() => import("./components/AboutView.tsx").then((m) => ({ default: m.AboutView })));

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="caps animate-pulse text-ink-faint">loading</span>
    </div>
  );
}

export default function App() {
  const view = useAppStore((s) => s.view);
  const step = useAppStore((s) => s.step);
  const glossaryOpen = useAppStore((s) => s.glossaryOpen);
  const main = useRef<HTMLElement>(null);

  // a new page or a new step starts at the top
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [view, step]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-ink">
      <TopBar />
      {/* on a wide screen the glossary stands next to the page instead of covering it */}
      <main
        ref={main}
        className={`flex-1 overflow-auto transition-[padding] duration-200 ${
          glossaryOpen && view !== "glossary" ? "xl:pr-[400px]" : ""
        }`}
      >
        <Suspense fallback={<Loading />}>
          {view === "home" ? (
            <HomeView />
          ) : view.startsWith("layer:") ? (
            <ChapterView index={Number(view.split(":")[1])} />
          ) : view === "concept-map" ? (
            <ConceptMapView />
          ) : view === "glossary" ? (
            <GlossaryView />
          ) : view === "quiz" ? (
            <QuizView />
          ) : view === "lab" ? (
            <LabView />
          ) : view === "factory" ? (
            <FactoryView />
          ) : (
            <AboutView />
          )}
        </Suspense>
      </main>
      <GlossaryDrawer />
    </div>
  );
}
