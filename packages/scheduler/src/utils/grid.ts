import { Interval } from "luxon";

export const generateTimeGrid = (
  intervals: Interval[],
  slotDurationMinutes: number,
): Interval[] => {
  const grid: Interval[] = [];

  for (const span of intervals) {
    if (!span.isValid || !span.start || !span.end) continue;

    let currentStart = span.start;
    const endLimit = span.end.minus({ minutes: slotDurationMinutes });

    while (currentStart <= endLimit) {
      grid.push(Interval.after(currentStart, { minutes: slotDurationMinutes }));
      currentStart = currentStart.plus({ minutes: slotDurationMinutes });
    }
  }

  return grid;
};
