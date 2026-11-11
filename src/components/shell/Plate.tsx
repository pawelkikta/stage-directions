import type { ReactNode } from "react";

/** Four screw heads in the corners of a plate. */
export function Screws() {
  return (
    <>
      <span aria-hidden className="screw screw-tl" />
      <span aria-hidden className="screw screw-tr" />
      <span aria-hidden className="screw screw-bl" />
      <span aria-hidden className="screw screw-br" />
    </>
  );
}

/**
 * An apparatus: a framed plate on grid paper with a label strip above it.
 * Used for every interactive widget, so the reader always knows
 * "this is something to play with, not text to read".
 */
export function Apparatus({
  label,
  name,
  caption,
  children,
}: {
  label: string;
  name: string;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="my-8">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="caps text-gold-soft">{label}</span>
        <span className="caps text-ink-faint">{name}</span>
      </div>
      <div className="plate grid-paper px-3 py-5 sm:px-6">
        <Screws />
        {children}
      </div>
      {caption && (
        <figcaption className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink-faint">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
