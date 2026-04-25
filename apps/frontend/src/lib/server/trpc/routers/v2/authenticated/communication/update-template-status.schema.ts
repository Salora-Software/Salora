import { z } from 'zod';

export const updateTemplateStatusSchema = z.object({
	organizationId: z.string().optional(),
	type: z.string(),
	target: z.string(),
	enabled: z.boolean()
});

export type UpdateTemplateStatusInput = z.infer<typeof updateTemplateStatusSchema>;
