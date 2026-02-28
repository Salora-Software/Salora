import { Interval } from "luxon";

export class IntervalUtils {
  static merge(intervals: Interval[]): Interval[] {
    const validIntervals = intervals.filter((i) => i.isValid && !i.isEmpty());
    if (validIntervals.length === 0) return [];
    
    const sorted = [...validIntervals].sort(
      (a, b) => (a.start?.toMillis() || 0) - (b.start?.toMillis() || 0),
    );
    const merged: Interval[] = [];

    for (const current of sorted) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push(current);
      } else if (last.overlaps(current) || last.abutsStart(current)) {
        const newEnd =
          last.end && current.end && last.end > current.end
            ? last.end
            : current.end;
        if (last.start && newEnd) {
          merged[merged.length - 1] = Interval.fromDateTimes(
            last.start,
            newEnd,
          );
        }
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  static subtract(source: Interval[], toRemove: Interval[]): Interval[] {
    let result = source.filter((i) => i.isValid && !i.isEmpty());
    const validToRemove = this.merge(toRemove);

    for (const remove of validToRemove) {
      const newResult: Interval[] = [];
      for (const sourceInterval of result) {
        if (sourceInterval.overlaps(remove)) {
          newResult.push(
            ...sourceInterval
              .difference(remove)
              .filter((i) => i.isValid && !i.isEmpty()),
          );
        } else {
          newResult.push(sourceInterval);
        }
      }
      result = newResult;
    }
    return result;
  }

  static intersect(listA: Interval[], listB: Interval[]): Interval[] {
    const intersections: Interval[] = [];
    for (const a of listA) {
      for (const b of listB) {
        const intersection = a.intersection(b);
        if (intersection && intersection.isValid && !intersection.isEmpty()) {
          intersections.push(intersection);
        }
      }
    }
    return this.merge(intersections);
  }
}
