import { z } from 'zod';

export const createCustomerSchema = z.object({
	organizationId: z.string(),
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Valid email is required'),
	phone: z.string().nullable().optional(),
	address: z.string().nullable().optional()
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
