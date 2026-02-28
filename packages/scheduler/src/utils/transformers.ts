import { Interval } from "luxon";
import { BlockedPeriod } from "../core/types";

// Helper om database rijen naar BlockedPeriods om te zetten
export const mapToBlockedPeriods = (
  items: any[],
  typeField: string = "type",
): BlockedPeriod[] => {
  return items.map((item) => ({
    id: item.id,
    interval: Interval.fromDateTimes(
      item.start || item.startTime,
      item.end || item.endTime,
    ),
    metadata: {
      type: item[typeField] || "BLOCK",
      ...item,
    },
  }));
};

export const formatIntervalsForApi = (intervals: Interval[]) => {
  return intervals.map((i) => ({
    start: i.start?.toISO(),
    end: i.end?.toISO(),
  }));
};
