import { z } from 'zod';

export const createBookingSchema = z.object({
	organizationId: z.string(),
	serviceId: z.string(),
	employeeId: z.string().optional(),
	date: z.date(),
	contact: z.object({
		firstName: z.string(),
		lastName: z.string(),
		email: z.string().email(),
		phone: z.any().optional(),
		notes: z.string().default('')
	})
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
