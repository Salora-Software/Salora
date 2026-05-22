import { DateTime, type WeekdayNumbers } from "luxon";
import { IntervalUtils } from "@salora/scheduler";
import { getIntervalsForDate, type WeekShift } from "./intervals";

type EmployeeAvailabilityInput = {
  member: {
    availabilities: WeekShift[];
    calendarItems: Array<{
      type: string;
      startTime: Date;
      endTime: Date;
    }>;
  };
};

export const buildBookedMinutesPerDate = (
  employees: EmployeeAvailabilityInput[],
  timeZone: string,
) => {
  const bookedMinutesPerDate = new Map<string, number>();

  for (const employee of employees) {
    const items = employee.member.calendarItems || [];

    for (const item of items) {
      if (item.type !== "BOOKING" && item.type !== "TIME_OFF") continue;

      const start = DateTime.fromJSDate(item.startTime).setZone(timeZone);
      const end = DateTime.fromJSDate(item.endTime).setZone(timeZone);
      
      let current = start.startOf("day");
      while (current < end) {
        const nextDay = current.plus({ days: 1 }).startOf("day");
        const intervalEnd = end < nextDay ? end : nextDay;
        const intervalStart = start > current ? start : current;
        
        const durationMinutes = (intervalEnd.toMillis() - intervalStart.toMillis()) / 60000;
        
        if (durationMinutes > 0) {
          const dateStr = current.toISODate()!;
          bookedMinutesPerDate.set(
            dateStr,
            (bookedMinutesPerDate.get(dateStr) || 0) + durationMinutes,
          );
        }
        
        current = nextDay;
      }
    }
  }

  return bookedMinutesPerDate;
};

export const buildCapacityPerWeekday = (
  openingTimes: WeekShift[],
  employees: EmployeeAvailabilityInput[],
  referenceDay: DateTime,
  timeZone: string,
) => {
  const capacityPerWeekday = new Map<number, number>();

  for (let i = 1; i <= 7; i++) {
    const refDay = referenceDay.set({ weekday: i as WeekdayNumbers });
    const orgIntervals = getIntervalsForDate(openingTimes, refDay, timeZone);

    let weekdayMinutes = 0;
    for (const employee of employees) {
      const empIntervals = getIntervalsForDate(
        employee.member.availabilities,
        refDay,
        timeZone,
      );
      const workingIntervals = IntervalUtils.intersect(
        orgIntervals,
        empIntervals,
      );

      for (const interval of workingIntervals) {
        weekdayMinutes +=
          (interval.end!.toMillis() - interval.start!.toMillis()) / 60000;
      }
    }

    capacityPerWeekday.set(i, weekdayMinutes);
  }

  return capacityPerWeekday;
};

export const buildOccupancyDays = (
  start: DateTime,
  end: DateTime,
  capacityPerWeekday: Map<number, number>,
  bookedMinutesPerDate: Map<string, number>,
) => {
  const daysResult: Array<{
    date: string;
    occupancyPercentage: number;
    available: boolean;
  }> = [];
  let currentDay = start;

  while (currentDay <= end) {
    const dayString = currentDay.toISODate()!;
    const weekday = currentDay.weekday;

    const totalWorkingMinutes = capacityPerWeekday.get(weekday) || 0;
    const totalBookedMinutes = bookedMinutesPerDate.get(dayString) || 0;

    let occupancyPercentage = 0;
    if (totalWorkingMinutes > 0) {
      occupancyPercentage = Math.round(
        (totalBookedMinutes / totalWorkingMinutes) * 100,
      );
      occupancyPercentage = Math.min(occupancyPercentage, 100);
    }

    daysResult.push({
      date: dayString,
      occupancyPercentage,
      available: occupancyPercentage < 100 && totalWorkingMinutes > 0,
    });

    currentDay = currentDay.plus({ days: 1 });
  }

  return daysResult;
};

export type { EmployeeAvailabilityInput };
