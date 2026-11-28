import { DateTime } from 'luxon';
import type { DayCapacity } from './types';

const MINUTES_PER_DAY = 24 * 60;

/** Minutes elapsed between `start` and `dayStart` (negative if before the day). */
export function minutesFromDayStart(start: Date, dayStart: Date): number {
	return (start.getTime() - dayStart.getTime()) / 60000;
}

/** Convert a minute count into a pixel offset for a given hour height. */
export function pxForMinutes(minutes: number, hourHeight: number): number {
	return (minutes / 60) * hourHeight;
}

export function pxForDate(date: Date, dayStart: Date, hourHeight: number): number {
	return pxForMinutes(minutesFromDayStart(date, dayStart), hourHeight);
}

/** Total minutes of a day that overlap with the [start, end] range. */
export function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
	const start = Math.max(aStart.getTime(), bStart.getTime());
	const end = Math.min(aEnd.getTime(), bEnd.getTime());
	return Math.max(0, (end - start) / 60000);
}

/** Clamp an interval to a day range, returning `null` when there is no overlap. */
export function clipToRange(
	start: Date,
	end: Date,
	rangeStart: Date,
	rangeEnd: Date
): { start: Date; end: Date } | null {
	const clippedStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
	const clippedEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
	if (clippedEnd.getTime() <= clippedStart.getTime()) return null;
	return { start: clippedStart, end: clippedEnd };
}

/** Start (00:00) and end (next 00:00) of the calendar day that `date` belongs to. */
export function dayBounds(date: DateTime): { start: Date; end: Date } {
	const start = date.startOf('day');
	return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
}

/** Monday 00:00 of the week that contains `date`, plus the following Monday. */
export function weekBounds(date: DateTime): { start: Date; end: Date; startDt: DateTime } {
	const startDt = date.startOf('week');
	return {
		start: startDt.toJSDate(),
		end: startDt.plus({ days: 7 }).toJSDate(),
		startDt
	};
}

export function dayMinutes(): number {
	return MINUTES_PER_DAY;
}

export type Positioned<T> = T & { laneIndex: number; lanesTotal: number };

/**
 * Assign horizontal lanes to overlapping events within a single column.
 * Events in the same overlap cluster share the available width; events that do
 * not overlap keep the full width.
 */
export function computeLanes<T extends { start: Date; end: Date }>(items: T[]): Positioned<T>[] {
	const sorted = [...items].sort(
		(a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime()
	);
	const result: Positioned<T>[] = [];
	let cluster: T[] = [];
	let clusterEnd = -Infinity;

	const flush = () => {
		if (cluster.length === 0) return;
		const laneEnds: number[] = [];
		const laneOf = new Map<T, number>();
		for (const event of cluster) {
			let lane = laneEnds.findIndex((end) => end <= event.start.getTime());
			if (lane === -1) {
				lane = laneEnds.length;
				laneEnds.push(event.end.getTime());
			} else {
				laneEnds[lane] = event.end.getTime();
			}
			laneOf.set(event, lane);
		}
		const total = laneEnds.length;
		for (const event of cluster) {
			result.push({ ...event, laneIndex: laneOf.get(event) ?? 0, lanesTotal: total });
		}
		cluster = [];
		clusterEnd = -Infinity;
	};

	for (const event of sorted) {
		if (cluster.length > 0 && event.start.getTime() >= clusterEnd) {
			flush();
		}
		cluster.push(event);
		clusterEnd = Math.max(clusterEnd, event.end.getTime());
	}
	flush();

	return result;
}

/** Format a minute count as a compact Dutch duration, e.g. `4u 30m`. */
export function formatBookedDuration(minutes: number): string {
	const rounded = Math.max(0, Math.round(minutes));
	const hours = Math.floor(rounded / 60);
	const mins = rounded % 60;
	if (hours === 0) return `${mins}m`;
	if (mins === 0) return `${hours}u`;
	return `${hours}u ${mins}m`;
}

export function occupancyRatio(bookedMinutes: number, availableMinutes: number): number {
	if (availableMinutes <= 0) return 0;
	return Math.min(1, bookedMinutes / availableMinutes);
}

export type WeekCapacityMap = Record<string, DayCapacity>;

export function dateKey(date: Date, timezone: string): string {
	return DateTime.fromJSDate(date).setZone(timezone).toISODate() ?? '';
}
