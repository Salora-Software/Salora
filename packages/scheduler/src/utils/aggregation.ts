import { Interval } from "luxon";

interface EmployeeResult {
  employeeId: string;
  intervals: Interval[];
  calendarItems: Interval[];
}

export interface AggregatedSlot {
  interval: Interval;
  availableCapacity: number;
  availableEmployees: string[];
}

export const aggregateAvailability = (
  results: EmployeeResult[],
): AggregatedSlot[] => {
  const slotMap = new Map<string, AggregatedSlot>();

  results.forEach(({ employeeId, intervals, calendarItems }) => {
    intervals.forEach((slot) => {
      const timeKey = slot.start?.toISO();
      if (!timeKey) return;

      if (!slotMap.has(timeKey)) {
        slotMap.set(timeKey, {
          interval: slot,
          availableCapacity: 0,
          availableEmployees: [],
        });
      }

      const aggregated = slotMap.get(timeKey)!;
      aggregated.availableCapacity += 1;
      aggregated.availableEmployees.push(employeeId);
    });
    calendarItems.forEach((booking) => {
      const timeKey = booking.start?.toISO();
      if (!timeKey) return;

      if (!slotMap.has(timeKey)) {
        slotMap.set(timeKey, {
          interval: booking,
          availableCapacity: 0,
          availableEmployees: [],
        });
      }
    });
  });

  // Retourneer gesorteerd op tijd
  return Array.from(slotMap.values()).sort(
    (a, b) => (a.interval.start?.toMillis() || 0) - (b.interval.start?.toMillis() || 0),
  );
};
