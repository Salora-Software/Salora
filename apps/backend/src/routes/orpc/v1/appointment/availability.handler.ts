import { aggregateAvailability } from "@salora/scheduler";
import {
  getDaySpanForDateTime,
  getIntervalsForDate,
} from "@salora/availability";

import { base } from "../../bases/public";
import { calculateEmployeeSlots } from "@/lib/appointment/availability.service";
import {
  createAppointmentContext,
  getBookingCutoffDateTime,
} from "@/lib/appointment/appointment-context.service";

import { getAvailabilityInputSchema } from "./availability.schema";

export const getAvailabilityHandler = base
  .route({ method: "GET" })
  .input(getAvailabilityInputSchema)
  .handler(
    async ({
      input: { branchId, serviceId, date },
      context: {
        var: { drizzle: db },
      },
    }) => {
      const initialSpan = getDaySpanForDateTime(date);

      const { organization, employees, timeZone, engine } =
        await createAppointmentContext(
          db,
          branchId,
          serviceId,
          initialSpan.utcSpan,
        );

      const localSpan = getDaySpanForDateTime(date, timeZone);
      const targetDate = localSpan.localStart;
      const searchSpan = localSpan.localSpan;
      const bookingCutoff = getBookingCutoffDateTime(
        timeZone,
        organization.minimumBookingTime,
      );

      const orgIntervals = getIntervalsForDate(
        organization.openingTimes,
        targetDate,
        timeZone,
      );
      const employeeResults = calculateEmployeeSlots(
        employees,
        engine,
        searchSpan,
        orgIntervals,
        targetDate,
        timeZone,
      );

      const fullTimeline = aggregateAvailability(employeeResults);

      const slots = fullTimeline.map((aggregated) => {
        const interval = aggregated.interval;
        const startsAfterCutoff = interval.start
          ? interval.start >= bookingCutoff
          : false;
        const availableCapacity = startsAfterCutoff
          ? aggregated.availableCapacity
          : 0;

        return {
          interval,
          availableCapacity,
          available: availableCapacity > 0,
          availableEmployees: aggregated.availableEmployees,
        };
      });

      const allBookings = employees.flatMap(
        (employee) => employee.member.calendarItems,
      );

      return {
        date: targetDate.toISODate(),
        slots,
        blocked: allBookings.map((booking) => ({
          start: booking.startTime,
          end: booking.endTime,
          type: booking.type,
        })),
      };
    },
  );
