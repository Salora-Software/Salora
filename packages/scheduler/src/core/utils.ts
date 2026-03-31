import { Interval } from "luxon";

export class IntervalUtils {
  static merge(intervals: Interval[]): Interval[] {
    if (!intervals || intervals.length === 0) return [];

    const valid = intervals.filter((i) => i.isValid && !i.isEmpty());
    if (valid.length <= 1) return valid;

    // Cache milliseconden voor snellere sortering en vergelijking
    const withMillis = valid
      .map((i) => ({
        interval: i,
        s: i.start!.toMillis(),
        e: i.end!.toMillis(),
      }))
      .sort((a, b) => a.s - b.s);

    const merged: Interval[] = [];
    let current = withMillis[0];

    for (let i = 1; i < withMillis.length; i++) {
      const next = withMillis[i];

      if (current.e >= next.s) {
        // Overlap of sluit direct aan
        if (next.e > current.e) {
          current.e = next.e;
          current.interval = Interval.fromDateTimes(
            current.interval.start!,
            next.interval.end!,
          );
        }
      } else {
        merged.push(current.interval);
        current = next;
      }
    }
    merged.push(current.interval);
    return merged;
  }

  static subtract(source: Interval[], toRemove: Interval[]): Interval[] {
    let currentSource = source.filter((i) => i.isValid && !i.isEmpty());
    const blocks = this.merge(toRemove);

    for (const block of blocks) {
      const bs = block.start!.toMillis();
      const be = block.end!.toMillis();
      const nextSource: Interval[] = [];

      for (const src of currentSource) {
        const ss = src.start!.toMillis();
        const se = src.end!.toMillis();

        if (se <= bs || ss >= be) {
          // Geen overlap, behoud het originele interval
          nextSource.push(src);
        } else {
          // Overlap: knip het interval handmatig op via milliseconden
          if (ss < bs)
            nextSource.push(Interval.fromDateTimes(src.start!, block.start!));
          if (se > be)
            nextSource.push(Interval.fromDateTimes(block.end!, src.end!));
        }
      }
      currentSource = nextSource;
    }
    return currentSource;
  }

  static intersect(listA: Interval[], listB: Interval[]): Interval[] {
    const intersections: Interval[] = [];

    for (const a of listA) {
      const as = a.start!.toMillis();
      const ae = a.end!.toMillis();

      for (const b of listB) {
        const bs = b.start!.toMillis();
        const be = b.end!.toMillis();

        if (ae <= bs || as >= be) continue; // Skip als er geen overlap is

        const start = as > bs ? a.start! : b.start!;
        const end = ae < be ? a.end! : b.end!;
        intersections.push(Interval.fromDateTimes(start, end));
      }
    }
    return this.merge(intersections);
  }
}
