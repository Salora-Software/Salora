import type { DateValue } from '@internationalized/date';
import { DateTime, type WeekdayNumbers } from 'luxon';
import { TimeSlot } from './types';

export function convertToUtc(time: string, dayOfWeek: number, organizationTimeZone: string): Date {
	const momentDayIndex = dayOfWeek - 1;
	const [hour, minute] = time.split(':').map(Number);

	// Initialiseer zonder tijd (zodat startOf('week') deze later niet overschrijft)
	let dt = DateTime.now().setZone(organizationTimeZone);

	if (momentDayIndex === 0) {
		dt = dt.startOf('week').minus({ days: 1 });
	} else {
		dt = dt.set({ weekday: momentDayIndex as WeekdayNumbers });
	}

	// Nu pas de exacte tijd instellen
	return dt.set({ hour, minute, second: 0, millisecond: 0 }).toJSDate();
}
export function convertCalendarDateToDayOfWeek(date: DateValue): number {
	const dayOfWeek = date.day;
	const dayOfWeekAdjusted = (dayOfWeek + 6) % 7; // Adjust to start week on Monday
	return dayOfWeekAdjusted + 1; // Adjust to 1-7 range
}

export function convertToLocal(utcTime: Date, organizationTimeZone: string): string {
	return DateTime.fromJSDate(utcTime).setZone(organizationTimeZone).toFormat('HH:mm');
}
export function convertToBase(date: Date, dayOfWeek: number): Date {
	date.setFullYear(1970);
	date.setMonth(0);
	date.setDate(dayOfWeek);
	return date;
}

export function convertToSlug(Text: string) {
	return Text.toLowerCase()
		.replace(/ /g, '-')
		.replace(/[^\w-]+/g, '');
}

type Booking = {
	from: DateTime;
	to: DateTime;
};

export function generateTimeSlots(
	start: string,
	end: string,
	duration: number,
	blockedItems: Booking[] = []
): TimeSlot[] {
	let timeSlots = [];
	// Use DateTime from luxon for start and end
	let current = DateTime.fromFormat(start, 'HH:mm');
	const endTime = DateTime.fromFormat(end, 'HH:mm');

	if (blockedItems && blockedItems.length) {
		blockedItems.sort((a, b) => a.from.toMillis() - b.from.toMillis());
	} else {
		blockedItems = [];
	}
	while (current < endTime) {
		let next = current.plus({ minutes: duration });

		if (next <= endTime) {
			timeSlots.push({
				from: current,
				to: next,
				available: false
			});
		}

		current = next;
	}
	return timeSlots.map((slot) => ({
		...slot,
		from: slot.from.toFormat('HH:mm'),
		to: slot.to.toFormat('HH:mm')
	}));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
