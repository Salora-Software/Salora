import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateTime } from 'luxon';
import { type DateValue } from '@internationalized/date';

export function convertToUtc(time: string, dayOfWeek: number, organizationTimeZone: string): Date {
	const [hour, minute] = time.split(':').map(Number);

	// Moment gebruikt 0 voor zondag, Luxon gebruikt 1 (maandag) t/m 7 (zondag).
	// Deze mapping behoudt exact de logica van je eerdere `${dayOfWeek - 1}` implementatie.
	const momentDay = dayOfWeek - 1;
	const luxonWeekday = (momentDay === 0 ? 7 : momentDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

	return DateTime.now()
		.setZone(organizationTimeZone)
		.set({
			weekday: luxonWeekday,
			hour,
			minute,
			second: 0,
			millisecond: 0
		})
		.toJSDate();
}

export function convertCalendarDateToDayOfWeek(date: DateValue): number {
	const dayOfWeek = date.day;
	const dayOfWeekAdjusted = (dayOfWeek + 6) % 7;
	return dayOfWeekAdjusted + 1;
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

export function cn(...inputs: ClassValue[]) {
	if (twMerge) return twMerge(clsx(inputs));
	else return clsx(inputs);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
