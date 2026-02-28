import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import moment from 'moment-timezone';
import {
	type DateValue
} from '@internationalized/date';

export function convertToUtc(time: string, dayOfWeek: number, organizationTimeZone: string): Date {
	const value = new Date(
		moment
			.tz(`${dayOfWeek - 1} ${time}`, 'd HH:mm', organizationTimeZone)
			.utc()
			.toISOString()
	);
	return value;
}
export function convertCalendarDateToDayOfWeek(date: DateValue): number {
	const dayOfWeek = date.day;
	const dayOfWeekAdjusted = (dayOfWeek + 6) % 7; // Adjust to start week on Monday
	return dayOfWeekAdjusted + 1; // Adjust to 1-7 range
}

export function convertToLocal(utcTime: Date, organizationTimeZone: string): string {
	return moment(utcTime).tz(organizationTimeZone).format('HH:mm');
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
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
