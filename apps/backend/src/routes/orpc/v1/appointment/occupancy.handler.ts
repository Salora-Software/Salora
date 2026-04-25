import { ORPCError } from "@orpc/server";
import { DateTime, Interval } from "luxon";
import {
  getRangeSpanForInterval,
  buildBookedMinutesPerDate,
  buildCapacityPerWeekday,
  buildOccupancyDays,
  getIntervalsForDate,
} from "@salora/availability";

import { base } from "../../bases/public";
import {
  createAppointmentContext,
  getBookingCutoffDateTime,
} from "@/lib/appointment/appointment-context.service";

import { getOccupancyInputSchema } from "./occupancy.schema";

export const getOccupancyHandler = base
  .route({ method: "GET" })
  .input(getOccupancyInputSchema)
  .handler(
    async ({
      input: { branchId, serviceId, range },
      context: {
        var: { drizzle: db },
      },
    }) => {
      if (!range.isValid || !range.start || !range.end) {
        throw new ORPCError("BAD_REQUEST", { message: "Invalid date range" });
      }

      const utcRangeSpan = getRangeSpanForInterval(range);

      const { organization, employees, timeZone } =
        await createAppointmentContext(
          db,
          branchId,
          serviceId,
          utcRangeSpan.utcSpan,
        );

      const localRangeSpan = getRangeSpanForInterval(range, timeZone);
      const start = localRangeSpan.localStart;
      const end = localRangeSpan.localEnd;
      const bookingCutoff = getBookingCutoffDateTime(
        timeZone,
        organization.minimumBookingTime,
      );

      const bookedMinutesPerDate = buildBookedMinutesPerDate(
        employees,
        timeZone,
      );
      const capacityPerWeekday = buildCapacityPerWeekday(
        organization.openingTimes,
        employees,
        start,
        timeZone,
      );
      const cutoffDay = bookingCutoff.toISODate();

      const daysResult = buildOccupancyDays(
        start,
        end,
        capacityPerWeekday,
        bookedMinutesPerDate,
      ).map((day) => {
        const dayDate = DateTime.fromISO(day.date, { zone: timeZone });

        if (dayDate < bookingCutoff.startOf("day")) {
          return {
            ...day,
            occupancyPercentage: 100,
            available: false,
          };
        }

        if (day.date !== cutoffDay) {
          return day;
        }

        const dayStart = dayDate.startOf("day");
        const dayEnd = dayDate.endOf("day");
        const remainingStart =
          bookingCutoff > dayStart ? bookingCutoff : dayStart;

        if (remainingStart >= dayEnd) {
          return {
            ...day,
            occupancyPercentage: 100,
            available: false,
          };
        }

        const remainingSpan = Interval.fromDateTimes(remainingStart, dayEnd);
        const orgIntervals = getIntervalsForDate(
          organization.openingTimes,
          dayDate,
          timeZone,
        );
        let remainingWorkingMinutes = 0;
        let remainingBookedMinutes = 0;

        for (const employee of employees) {
          const employeeIntervals = getIntervalsForDate(
            employee.member.availabilities,
            dayDate,
            timeZone,
          );

          for (const orgInterval of orgIntervals) {
            for (const employeeInterval of employeeIntervals) {
              const workingInterval =
                orgInterval.intersection(employeeInterval);
              if (!workingInterval?.isValid) continue;

              const clippedWorkingInterval =
                workingInterval.intersection(remainingSpan);
              if (!clippedWorkingInterval?.isValid) continue;

              remainingWorkingMinutes +=
                (clippedWorkingInterval.end!.toMillis() -
                  clippedWorkingInterval.start!.toMillis()) /
                60000;
            }
          }

          for (const item of employee.member.calendarItems || []) {
            if (item.type !== "BOOKING") continue;

            const bookingInterval = Interval.fromDateTimes(
              DateTime.fromJSDate(item.startTime).setZone(timeZone),
              DateTime.fromJSDate(item.endTime).setZone(timeZone),
            );
            const clippedBookingInterval =
              bookingInterval.intersection(remainingSpan);
            if (!clippedBookingInterval?.isValid) continue;

            remainingBookedMinutes +=
              (clippedBookingInterval.end!.toMillis() -
                clippedBookingInterval.start!.toMillis()) /
              60000;
          }
        }

        let occupancyPercentage = 0;
        if (remainingWorkingMinutes > 0) {
          occupancyPercentage = Math.round(
            (remainingBookedMinutes / remainingWorkingMinutes) * 100,
          );
          occupancyPercentage = Math.min(occupancyPercentage, 100);
        }

        return {
          ...day,
          occupancyPercentage,
          available: occupancyPercentage < 100 && remainingWorkingMinutes > 0,
        };
      });

      return { days: daysResult };
    },
  );
