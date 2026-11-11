/** Exam weight badge - the color depends on the size of the percentage. */
export function WeightBadge({ weight }: { weight: number }) {
  if (weight <= 0) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-faint border border-border">
        baza
      </span>
    );
  }
  const tone =
    weight >= 20
      ? "bg-weight-hi/20 text-weight-hi border-weight-hi/40"
      : weight >= 12
        ? "bg-weight-mid/15 text-weight-mid border-weight-mid/40"
        : "bg-weight-lo/15 text-ink-muted border-weight-lo/40";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${tone}`}>
      {weight}%
    </span>
  );
}
