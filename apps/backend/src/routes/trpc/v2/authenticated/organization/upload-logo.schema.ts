import { z } from 'zod';

export const generateLogoUploadUrlSchema = z.object({
	organizationId: z.string(),
	fileSize: z.number().optional()
});

export type GenerateLogoUploadUrlInput = z.infer<typeof generateLogoUploadUrlSchema>;
