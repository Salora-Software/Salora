import { Interval, DateTime } from "luxon";

export const generateTimeGrid = (
  intervals: Interval[],
  slotDurationMinutes: number,
  alignToStart?: DateTime, // Optioneel: het startpunt voor een fixed grid
): Interval[] => {
  const grid: Interval[] = [];
  const durationMs = slotDurationMinutes * 60000;
  const alignMs = alignToStart?.toMillis();

  for (const span of intervals) {
    if (!span.start || !span.end) continue;

    const gapStartMs = span.start.toMillis();
    const gapEndMs = span.end.toMillis();
    let currentMs = gapStartMs;

    // Bij een fixed grid: verschuif currentMs naar het eerstvolgende vaste slot
    if (alignMs !== undefined) {
      const offset = (gapStartMs - alignMs) % durationMs;
      if (offset > 0) {
        currentMs += durationMs - offset;
      } else if (offset < 0) {
        currentMs += Math.abs(offset);
      }
    }

    const zone = span.start.zone;

    // Creëer pas een Luxon object als we zeker weten dat het slot past
    while (currentMs + durationMs <= gapEndMs) {
      grid.push(
        Interval.fromDateTimes(
          DateTime.fromMillis(currentMs, { zone }),
          DateTime.fromMillis(currentMs + durationMs, { zone }),
        ),
      );
      currentMs += durationMs;
    }
  }

  return grid;
};
