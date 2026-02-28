import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import moment from 'moment-timezone';
import type { TimeSlot } from './types';
import type { DateValue } from '@internationalized/date';
import { DateTime } from 'luxon';

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

export const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		const img: HTMLImageElement = document.createElement('img');

		img.onload = () => {
			// Crop to 1:1 aspect ratio (center crop)
			let { width, height } = img;
			const size = Math.min(width, height);
			const sx = (width - size) / 2;
			const sy = (height - size) / 2;

			// Resize to maxWidth x maxWidth
			canvas.width = maxWidth;
			canvas.height = maxWidth;

			// Draw and compress image (center crop to square)
			ctx.drawImage(img, sx, sy, size, size, 0, 0, maxWidth, maxWidth);

			canvas.toBlob(
				(blob) => {
					if (blob) {
						const compressedFile = new File([blob], file.name, {
							type: 'image/jpeg',
							lastModified: Date.now()
						});
						resolve(compressedFile);
					} else {
						resolve(file); // Fallback to original if compression fails
					}
				},
				'image/jpeg',
				quality
			);
		};

		img.src = URL.createObjectURL(file);
	});
};
