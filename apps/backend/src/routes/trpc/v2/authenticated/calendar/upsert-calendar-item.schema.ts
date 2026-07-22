import { z } from 'zod';

const bookingCalendarItemSchema = z.object({
	type: z.literal('BOOKING'),
	organizationId: z.string(),
	title: z.string().optional().nullable().default(''),
	startTime: z.date(),
	endTime: z.date(),
	notes: z.string().optional().nullable().default(''),
	id: z.string().optional().nullable(),
	status: z.string(),
	serviceId: z.string().optional().nullable(),
	memberId: z.string().optional().nullable(),
	customerId: z.string().optional().nullable()
});

const nonBookingCalendarItemSchema = z.object({
	id: z.string().optional().nullable(),
	type: z.string().refine((val) => val !== 'BOOKING', {
		message: 'for_non_booking_calendar_items_use_a_type_other_than_booking'
	}),
	organizationId: z.string(),
	title: z.string().optional().nullable().default(''),
	startTime: z.date(),
	endTime: z.date(),
	notes: z.string().optional().nullable().default('')
});

export const upsertCalendarItemSchema = z.union([
	bookingCalendarItemSchema,
	nonBookingCalendarItemSchema
]);

export type UpsertCalendarItemInput = z.infer<typeof upsertCalendarItemSchema>;
