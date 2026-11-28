import type { DateTime } from 'luxon';
import type { DateValue } from '@internationalized/date';
import type { MemberType, ServiceType } from '$lib/trpc';
import type { BookingStatus } from '$lib/booking-status';

export type CalendarEvent = {
	id: string;
	start: Date;
	end: Date;
	memberId: string | null;
	title: string;
	customerName?: string;
	serviceName?: string;
	serviceId?: string;
	status?: BookingStatus;
	notes?: string;
	kind: 'BOOKING' | 'NOTE' | 'TIME_OFF' | 'AVAILABILITY';
};

export type OffShiftBlock = {
	memberId: string;
	start: Date;
	end: Date;
};

export type StatusMinutes = {
	PENDING: number;
	CONFIRMED: number;
	COMPLETED: number;
	CANCELLED: number;
};

export type CalendarResource = {
	id: string;
	name: string;
	avatar?: string;
	bookedMinutes: number;
	availableMinutes: number;
	statusMinutes: StatusMinutes;
	virtual?: boolean;
};

export type BookingEditData = {
	title: string;
	notes: string;
	status?: BookingStatus;
	startDate?: DateTime;
	endDate?: DateTime;
	serviceId?: string;
	memberId?: string;
};

export type DayCapacity = {
	date: Date;
	bookedMinutes: number;
	availableMinutes: number;
};

export type WeekStripDay = {
	date: DateValue;
	weekdayShort: string;
	dayNumber: number;
	bookedMinutes: number;
	availableMinutes: number;
	isToday: boolean;
	isSelected: boolean;
};

export type WeekDayColumn = {
	date: DateValue;
	dayStart: Date;
	dayEnd: Date;
	weekdayShort: string;
	dayNumber: number;
	isToday: boolean;
	bookedMinutes: number;
	availableMinutes: number;
};

export type CalendarView = 'day' | 'week';

export type EventChangeHandler = (id: string, start: Date, end: Date) => Promise<void> | void;
export type EventDeleteHandler = (id: string) => Promise<void> | void;
export type EventSaveHandler = (id: string, data: BookingEditData) => Promise<void> | void;
export type DragStateHandler = (dragging: boolean) => void;

export type CalendarUiProps = {
	services?: ServiceType[];
	members?: MemberType[];
	timezone: string;
};
