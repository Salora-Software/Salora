import { z } from 'zod';

export const confirmLogoUploadSchema = z.object({
	imageId: z.string()
});

export type ConfirmLogoUploadInput = z.infer<typeof confirmLogoUploadSchema>;
