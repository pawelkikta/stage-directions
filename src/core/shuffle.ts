/* ===========================================================================
 * Shuffling answers.
 *
 * In the data the correct answer usually stands in second place, so the order
 * from the file would be a hint ("always B" gave ~89%). So every view
 * with a closed question shuffles the options when it shows them, and the data stays
 * unchanged.
 * ======================================================================== */

/** Fisher-Yates on a copy of the array. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A copy of the question with shuffled options; `answer` still points to the correct one. */
export function withShuffledOptions<T extends { options: string[]; answer: number }>(q: T): T {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}
