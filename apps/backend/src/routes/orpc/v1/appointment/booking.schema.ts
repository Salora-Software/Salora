import { z } from 'zod';

export const createBookingInputSchema = z.object({
	organizationId: z.string(),
	serviceId: z.string(),
	employeeId: z.string().optional(),
	date: z.date(),
	contact: z.object({
		firstName: z.string(),
		lastName: z.string(),
		email: z.string().email(),
		phone: z.string().optional(),
		notes: z.string().default(''),
	}),
});

export const cancelAppointmentInputSchema = z.object({
	appointmentId: z.string(),
	branchId: z.string(),
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
