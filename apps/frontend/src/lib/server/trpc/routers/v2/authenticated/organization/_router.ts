import { router as createRouter, privateProcedure } from '../../../../context';
import { generateLogoUploadUrlSchema } from './upload-logo.schema';
import { confirmLogoUploadSchema } from './confirm-logo.schema';

export const router = createRouter({
	generateLogoUploadUrl: privateProcedure
		.input(generateLogoUploadUrlSchema)
		.mutation(async (opts) => {
			const { generateLogoUploadUrlHandler } = await import('./upload-logo.handler');
			return await generateLogoUploadUrlHandler(opts);
		}),

	confirmLogoUpload: privateProcedure
		.input(confirmLogoUploadSchema)
		.mutation(async (opts) => {
			const { confirmLogoUploadHandler } = await import('./confirm-logo.handler');
			return await confirmLogoUploadHandler(opts);
		})
});
