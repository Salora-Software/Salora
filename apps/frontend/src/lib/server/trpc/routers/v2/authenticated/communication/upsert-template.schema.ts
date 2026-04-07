import { z } from 'zod';

export const upsertTemplateSchema = z.object({
	organizationId: z.string().optional(),
	type: z.string(),
	subject: z.string(),
	body: z.string(),
	target: z.string()
});

export type UpsertTemplateInput = z.infer<typeof upsertTemplateSchema>;