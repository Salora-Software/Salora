import { z } from 'zod';

export const confirmLogoUploadSchema = z.object({
	organizationId: z.string(),
	imageId: z.string()
});

export type ConfirmLogoUploadInput = z.infer<typeof confirmLogoUploadSchema>;
