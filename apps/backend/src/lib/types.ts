import type { CalendarDate } from '@internationalized/date';
import type { Interval } from 'luxon';

export interface TimeSlot {
	from: string;
	to: string;
	available: boolean;
}
export interface TimeSlotV2 {
	from: string;
	to: string;
	dayOfWeek: number;
	calendarDate: CalendarDate;
	serviceId: string;
	available: boolean;
}

export interface OpeningTime {
	dayOfWeek: number;
	from: string;
	to: string;
}

export interface CalendarDateObject {
	year: number;
	month: number;
	day: number;
}
export type EmployeeServiceInterval = {
	interval: Interval;
	employeeId: string;
	serviceId: string;
};

export interface Customer {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	address?: string | null;
	createdAt: Date;
	statistics?: {
		bookingCount: number;
		lastBookingDate: Date | null;
		reliabilityRating: 'Laag' | 'Gemiddeld' | 'Hoog';
		averageBookingValue: number | null;
	};
	bookings?: Array<{
		id: string;
		createdAt: Date;
		status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
		service: {
			name: string;
			price: number;
		};
	}>;
}
