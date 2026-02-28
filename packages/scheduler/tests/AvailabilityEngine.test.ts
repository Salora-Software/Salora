import { describe, it, expect } from "vitest";
import { DateTime, Interval } from "luxon";
import { AvailabilityEngine } from "../src/AvailabilityEngine";
import { SchedulerConfig, SchedulerInput } from "../src/core/types";

// Gebruik een dynamische datum in de toekomst
const baseDate = DateTime.now().toUTC().startOf("day").plus({ days: 1 });

const defaultConfig: SchedulerConfig = {
  slotDurationMinutes: 60,
  bufferMinutes: 0,
};

describe("AvailabilityEngine", () => {
  it("should calculate basic slots when everything is open", () => {
    const engine = new AvailabilityEngine(defaultConfig).useDefaultPipeline();

    // Zoek binnen een span van 4 uur (00:00 - 04:00)
    const input: SchedulerInput = {
      searchSpan: Interval.fromDateTimes(baseDate, baseDate.plus({ hours: 4 })),
      blockedPeriods: [],
    };

    const result = engine.getAvailableSlots(input);

    expect(result.intervals).toHaveLength(4);
    expect(result.intervals[0].start?.toISOTime()?.substring(0, 5)).toBe(
      "00:00",
    );
    expect(result.intervals[3].start?.toISOTime()?.substring(0, 5)).toBe(
      "03:00",
    );
    expect(result.impacts).toHaveLength(0); // Niets weggesneden
  });

  it("should subtract existing bookings and log impacts", () => {
    const engine = new AvailabilityEngine(defaultConfig).useDefaultPipeline();

    const input: SchedulerInput = {
      searchSpan: Interval.fromDateTimes(baseDate, baseDate.plus({ hours: 4 })),
      blockedPeriods: [
        {
          id: "booking-1",
          interval: Interval.fromDateTimes(
            baseDate.plus({ hours: 1 }),
            baseDate.plus({ hours: 2 }),
          ),
          metadata: { type: "booking", customer: "Youri" },
        },
      ],
    };

    const result = engine.getAvailableSlots(input);
    console.log(JSON.stringify(result, null, 2));

    // Verwacht: 00:00-01:00, (01:00-02:00 geblokkeerd), 02:00-03:00, 03:00-04:00
    expect(result.intervals).toHaveLength(3);
    expect(result.intervals[0].start?.toISOTime()?.substring(0, 5)).toBe(
      "00:00",
    );
    expect(result.intervals[1].start?.toISOTime()?.substring(0, 5)).toBe(
      "02:00",
    );

    // Controleer de herleidbaarheid (Audit Trail)
    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].reason.id).toBe("booking-1");
    expect(
      result.impacts[0].removedInterval.start?.toISOTime()?.substring(0, 5),
    ).toBe("01:00");
  });

  it("should apply buffers correctly before subtracting", () => {
    const engine = new AvailabilityEngine({
      slotDurationMinutes: 30, // 30 min slots
      bufferMinutes: 15, // 15 min buffer na elke boeking
    }).useDefaultPipeline();

    const input: SchedulerInput = {
      searchSpan: Interval.fromDateTimes(
        baseDate.set({ hour: 9 }),
        baseDate.set({ hour: 12 }),
      ),
      blockedPeriods: [
        {
          id: "booking-1",
          interval: Interval.fromDateTimes(
            baseDate.set({ hour: 10 }),
            baseDate.set({ hour: 11 }),
          ),
          metadata: { type: "booking" }, // BufferModule reageert op type: 'booking'
        },
      ],
    };

    const result = engine.getAvailableSlots(input);

    // De boeking van 10:00-11:00 krijgt 15m buffer -> blokkade wordt 10:00-11:15
    // Strakke grid (30m) vanaf 09:00:
    // 09:00-09:30 (ok)
    // 09:30-10:00 (ok)
    // 10:00-10:30 (overlapt)
    // 10:30-11:00 (overlapt)
    // 11:00-11:30 (overlapt vanwege buffer tot 11:15)
    // 11:30-12:00 (ok)

    const times = result.intervals.map((i) => i.start?.toFormat("HH:mm"));
    expect(times).toEqual(["09:00", "09:30", "11:30"]);

    // De impact logging toont de verwijderde tijd INCLUSIEF buffer
    expect(result.impacts[0].removedInterval.end?.toFormat("HH:mm")).toBe(
      "11:15",
    );
  });

  describe("Complex Scenarios", () => {
    it("should handle 'free time' blocks (e.g. lunch breaks) as blockages", () => {
      // In de nieuwe engine vertaal je gaten in beschikbaarheid (zoals lunch)
      // naar een extra BlockedPeriod.
      const engine = new AvailabilityEngine(defaultConfig).useDefaultPipeline();

      const input: SchedulerInput = {
        searchSpan: Interval.fromDateTimes(
          baseDate.set({ hour: 9 }),
          baseDate.set({ hour: 17 }),
        ),
        blockedPeriods: [
          {
            id: "lunch-break",
            interval: Interval.fromDateTimes(
              baseDate.set({ hour: 12 }),
              baseDate.set({ hour: 13 }),
            ),
            metadata: { type: "break" }, // BufferModule negeert dit, SubtractionModule knipt het eruit
          },
        ],
      };

      const result = engine.getAvailableSlots(input);

      // Verwacht: 9-10, 10-11, 11-12, (lunch), 13-14, 14-15, 15-16, 16-17
      expect(result.intervals).toHaveLength(7);

      const hasLunchSlot = result.intervals.some((s) => s.start?.hour === 12);
      expect(hasLunchSlot).toBe(false);
    });

    it("should never return partial slots (SlotChunkingModule enforces duration)", () => {
      const engine = new AvailabilityEngine({
        slotDurationMinutes: 60,
      }).useDefaultPipeline();

      const input: SchedulerInput = {
        searchSpan: Interval.fromDateTimes(
          baseDate.set({ hour: 9 }),
          baseDate.set({ hour: 13 }),
        ),
        blockedPeriods: [
          // Blokkeert de beschikbaarheid vanaf 09:50
          {
            id: "early-block",
            interval: Interval.fromDateTimes(
              baseDate.set({ hour: 9, minute: 50 }),
              baseDate.set({ hour: 11 }),
            ),
            metadata: { type: "unavailability" },
          },
        ],
      };

      const result = engine.getAvailableSlots(input);

      // Overgebleven ruwe tijd: 09:00-09:50 (50 min) & 11:00-13:00 (120 min)
      // SlotChunking hakt dit in blokken van 60.
      // De 50 minuten past niet, dus 09:00 vervalt. Vanaf 11:00 passen er exact twee.

      expect(result.intervals).toHaveLength(2);
      expect(result.intervals[0].start?.toFormat("HH:mm")).toBe("11:00");
      expect(result.intervals[1].start?.toFormat("HH:mm")).toBe("12:00");

      // Verifieer expliciet dat het resultaat echt 60 minuten is
      const duration = result.intervals[0].toDuration("minutes").minutes;
      expect(duration).toBe(60);
    });
  });
});
