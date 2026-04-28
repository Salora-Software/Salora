import { z } from 'zod';

export const getCustomersSchema = z.object({
	organizationId: z.string(),
	skip: z.number().optional().default(0),
	take: z.number().optional().default(10),
	search: z.string().optional()
});

export type GetCustomersInput = z.infer<typeof getCustomersSchema>;
