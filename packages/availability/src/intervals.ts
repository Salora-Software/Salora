import { DateTime, Interval } from "luxon";

export type WeekShift = {
  dayOfWeek: number;
  startTimeUtc: string | Date;
  endTimeUtc: string | Date;
};

export const getIntervalsForDate = (
  shifts: WeekShift[],
  date: DateTime,
  timeZone: string,
) => {
  const targetWeekday = date.weekday === 7 ? 0 : date.weekday;

  return shifts
    .filter((s) => s.dayOfWeek === targetWeekday)
    .map((s) => {
      const sStart = DateTime.fromJSDate(new Date(s.startTimeUtc), {
        zone: "UTC",
      }).setZone(timeZone);
      const sEnd = DateTime.fromJSDate(new Date(s.endTimeUtc), {
        zone: "UTC",
      }).setZone(timeZone);

      return Interval.fromDateTimes(
        date.set({ hour: sStart.hour, minute: sStart.minute }),
        date.set({ hour: sEnd.hour, minute: sEnd.minute }),
      );
    })
    .filter((i) => i.isValid);
};
