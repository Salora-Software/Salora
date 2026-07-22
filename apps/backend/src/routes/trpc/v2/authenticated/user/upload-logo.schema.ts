import { z } from 'zod';

export const generateLogoUploadUrlSchema = z.object({
	fileSize: z.number().optional()
});

export type GenerateLogoUploadUrlInput = z.infer<typeof generateLogoUploadUrlSchema>;
