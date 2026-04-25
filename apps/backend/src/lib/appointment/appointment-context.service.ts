import {
  AvailabilityEngine,
  type ConfiguredEngine,
  type SchedulerConfig,
} from "@salora/scheduler";
import type { DatabaseType } from "@salora/database";
import { DateTime, type Interval } from "luxon";

import { fetchBookingData } from "./availability.service";

export const getTimeZoneOrDefault = (timeZone?: string | null) =>
  timeZone || "UTC";

export const getMinimumBookingLeadHours = (
  minimumBookingTime?: number | null,
) => {
  if (
    typeof minimumBookingTime !== "number" ||
    Number.isNaN(minimumBookingTime)
  )
    return 0;
  return Math.max(0, minimumBookingTime);
};

export const getBookingCutoffDateTime = (
  timeZone: string,
  minimumBookingTime?: number | null,
) => {
  const leadHours = getMinimumBookingLeadHours(minimumBookingTime);
  return DateTime.now().setZone(timeZone).plus({ hours: leadHours });
};

type AppointmentData = Awaited<ReturnType<typeof fetchBookingData>>;

export type AppointmentContext = AppointmentData & {
  timeZone: string;
  engine: ConfiguredEngine<SchedulerConfig>;
};

export const createAvailabilityEngine = (
  slotDurationMinutes: number,
  autoShiftTimeSlot?: boolean | null,
): ConfiguredEngine<SchedulerConfig> => {
  return new AvailabilityEngine().useDefaultPipeline().withConfig({
    slotDurationMinutes,
    bufferMinutes: 0,
    gridStrategy: autoShiftTimeSlot ? "flexible" : "fixed",
  });
};

export const createAppointmentContext = async (
  db: DatabaseType,
  organizationId: string,
  serviceId: string,
  searchSpan: Interval,
): Promise<AppointmentContext> => {
  const { organization, service, employees } = await fetchBookingData(
    db,
    organizationId,
    serviceId,
    searchSpan,
  );

  return {
    organization,
    service,
    employees,
    timeZone: getTimeZoneOrDefault(organization.timeZone),
    engine: createAvailabilityEngine(
      service.duration,
      organization.autoShiftTimeSlot,
    ),
  };
};
