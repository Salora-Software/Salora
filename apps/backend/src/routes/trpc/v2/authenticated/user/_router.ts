import { router as createRouter, privateProcedure } from '@/middleware/trpc';
import { generateLogoUploadUrlSchema } from './upload-logo.schema';
import { confirmLogoUploadSchema } from './confirm-logo.schema';
import { generateLogoUploadUrlHandler } from './upload-logo.handler';
import { confirmLogoUploadHandler } from './confirm-logo.handler';

export const router = createRouter({
	generateLogoUploadUrl: privateProcedure
		.input(generateLogoUploadUrlSchema)
		.mutation(async (opts) => {
			return await generateLogoUploadUrlHandler(opts);
		}),

	confirmLogoUpload: privateProcedure.input(confirmLogoUploadSchema).mutation(async (opts) => {
		return await confirmLogoUploadHandler(opts);
	})
});
