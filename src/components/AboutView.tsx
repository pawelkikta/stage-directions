import type { ReactNode } from "react";
import { APP_VERSION_LABEL } from "../core/version.ts";
import { APP_NAME } from "../core/brand.ts";

const AUTHOR = "Paweł Kikta";
const YEAR = "2026";
const REPO = "https://github.com/pawelkikta/stage-directions";

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-copper underline underline-offset-4 hover:text-ink">
      {children}
    </a>
  );
}

export function AboutView() {
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-24 pt-10 sm:px-6">
      <p className="caps text-gold-soft">About · {APP_VERSION_LABEL}</p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[38px]">{APP_NAME}</h1>
      <p className="mt-4 text-[17px] leading-[1.72] text-ink-muted">
        A free study app for OpenUSD and the NVIDIA OpenUSD Development certification (NCP-OUSD). It follows the exam
        blueprint chapter by chapter and shows how USD concepts connect, not only what they are.
      </p>

      <Section title="How the content was made">
        <p>
          The lessons, questions, situations, scripts and the code were written by the AI model{" "}
          <strong className="text-ink">Claude</strong> (Anthropic) at my direction, while I studied for the exam. I
          chose the scope, asked the questions, reported mistakes and decided on the fixes.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            Lessons were compared with <Link href="https://docs.nvidia.com/learn-openusd/">Learn OpenUSD</Link> and
            the <Link href="https://openusd.org">OpenUSD documentation</Link>.
          </li>
          <li>
            Every Predict and Find-the-bug situation and every script in the Run steps was run on real OpenUSD. The
            outputs you see were recorded from those runs.
          </li>
        </ul>
        <p className="mt-3">This is not an expert review. Use the app as a study aid, not as a source.</p>
        <p className="mt-3">
          Found a mistake? Report it in <Link href={`${REPO}/issues`}>Issues</Link>, if you can with a link to the
          documentation or a short script that shows the behavior.
        </p>
      </Section>

      <Section title="Not affiliated">
        <p>
          {APP_NAME} is an independent project. It is <strong className="text-ink">not affiliated with or endorsed by</strong>{" "}
          NVIDIA, Pixar or the Alliance for OpenUSD (AOUSD). The practice questions are written for practice and do not
          come from the real exam.
        </p>
        <p className="mt-3">
          NVIDIA, Omniverse and NCP-OUSD are trademarks of NVIDIA Corporation. USD and OpenUSD are projects of Pixar and
          the Alliance for OpenUSD. All marks belong to their owners.
        </p>
      </Section>

      <Section title="Sources">
        <p>
          The chapter order follows the modules of{" "}
          <Link href="https://github.com/NVIDIA-Omniverse/LearnOpenUSD">Learn OpenUSD</Link> (NVIDIA, Apache-2.0) and the
          exam topic weights that NVIDIA publishes for NCP-OUSD. Before the exam, check the current official
          documentation.
        </p>
      </Section>

      <Section title="Privacy">
        <p>Your progress stays in your browser (localStorage). The app sends no data and has no analytics.</p>
      </Section>

      <Section title="License">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Code: <strong className="text-ink">MIT</strong>.
          </li>
          <li>
            Educational content (lessons, questions, situations, scripts, glossary):{" "}
            <strong className="text-ink">CC0 1.0</strong>, public domain. You can use it for anything, no permission
            needed.
          </li>
          <li>Fonts: IBM Plex Sans and IBM Plex Mono, SIL Open Font License 1.1.</li>
        </ul>
      </Section>

      <p className="mt-10 border-t border-rule pt-4 font-mono text-[12px] text-ink-faint">
        © {YEAR} {AUTHOR} · <Link href={REPO}>source code on GitHub</Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="caps border-b border-rule pb-2 text-ink">{title}</h2>
      <div className="mt-3 text-[16px] leading-[1.7] text-ink-muted">{children}</div>
    </section>
  );
}
