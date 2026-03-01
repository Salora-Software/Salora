import { trpc } from '$lib/trpc.js';
import { toast } from 'svelte-sonner';
import type { DateValue } from '@internationalized/date';
import { DateTime, Interval } from 'luxon';
import type { DetailedValue } from 'svelte-tel-input/types';
import type { RouterOutput } from '@salora/trpc-types';
import { m } from '$lib/paraglide/messages.js';

export interface BookingValues {
	appointment: {
		value: string;
		employeeId: string;
	};
	date: {
		loading: boolean;
		placeholder: DateValue | undefined;
		calendarValue: DateValue | undefined;
		timeValue: Interval | undefined;
	};
	contact: {
		firstName: string;
		lastName: string;
		email: string;
		phone: DetailedValue;
		notes: string;
	};
}

export interface BookingButton {
	icon: any;
	name: string;
	id?: string;
	description: string | (() => string);
	active: boolean;
	selected: boolean;
	onNext?: () => Promise<boolean>;
}

// Caches
const occupancyCache = new Map<string, RouterOutput['appointment']['getOccupancy']>();
const availabilityCache = new Map<string, RouterOutput['appointment']['getAvailability']>();

export async function loadOccupancy(
	year: number,
	month: number,
	serviceId: string,
	branchId: string,
	timeZone: string
): Promise<RouterOutput['appointment']['getOccupancy'] | undefined> {
	const key = `${year}-${month}-${serviceId}-${branchId}`;
	if (occupancyCache.has(key)) return occupancyCache.get(key);

	const start = DateTime.fromObject({ year, month, day: 1 }, { zone: timeZone }).startOf('month');
	const end = start.endOf('month');

	try {
		const response = await trpc.appointment.getOccupancy.query({
			branchId,
			serviceId,
			range: Interval.fromDateTimes(start, end).toISO()
		});
		occupancyCache.set(key, response);
		return response;
	} catch (e) {
		console.error('Failed to load occupancy', e);
		return undefined;
	}
}

export async function loadDayAvailability(
	date: DateTime,
	serviceId: string,
	branchId: string
): Promise<RouterOutput['appointment']['getAvailability'] | undefined> {
	const key = `${date.toISODate()}-${serviceId}-${branchId}`;
	if (availabilityCache.has(key)) return availabilityCache.get(key);

	try {
		const response = await trpc.appointment.getAvailability.query({
			branchId,
			serviceId,
			date: date.toISODate()!
		});
		availabilityCache.set(key, response);
		return response;
	} catch (e) {
		console.error('Failed to load day availability', e);
		return undefined;
	}
}

export async function createBooking(
	values: BookingValues,
	branch: any
): Promise<{ success: boolean; employeeId?: string }> {
	if (!values.contact.phone.phoneNumber || values.contact.phone.phoneNumber === '') {
		toast.error(m['booking.toast.invalidPhone']());
		return { success: false };
	}
	let date = values.date.timeValue?.start;
	if (!date) {
		toast.error(m['booking.toast.invalidDateTime']());
		return { success: false };
	}
	try {
		const response = await trpc.appointment.createBooking.mutate({
			serviceId: values.appointment.value,
			branchId: branch.id,
			organizationId: branch.id,
			date: date.toJSDate(),
			contact: {
				email: values.contact.email,
				phone: values.contact.phone,
				firstName: values.contact.firstName,
				lastName: values.contact.lastName,
				notes: values.contact.notes
			}
		});

		return {
			success: true,
			employeeId: response.booking.employeeId!
		};
	} catch (error) {
		return { success: false };
	}
}

export function validateBookingStep(stepId: string, values: BookingValues): boolean {
	switch (stepId) {
		case 'appointment':
			return !!values.appointment.value;
		case 'datetime':
			return !!(values.date.calendarValue && values.date.timeValue);
		case 'contact':
			return !!(values.contact.firstName && values.contact.lastName && values.contact.email);
		default:
			return true;
	}
}

export function saveContactToLocalStorage(contact: BookingValues['contact']): void {
	localStorage.setItem('contact', JSON.stringify(contact));
}

export function loadContactFromLocalStorage(): BookingValues['contact'] | null {
	const storedContact = localStorage.getItem('contact');
	return storedContact ? JSON.parse(storedContact) : null;
}
