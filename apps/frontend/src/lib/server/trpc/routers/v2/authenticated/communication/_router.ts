import { router as createRouter, privateProcedure } from '../../../../context';
import { updateTemplateStatusHandler } from './update-template-status.handler';
import { updateTemplateStatusSchema } from './update-template-status.schema';
import { upsertTemplateHandler } from './upsert-template.handler';
import { upsertTemplateSchema } from './upsert-template.schema';

export const router = createRouter({
	updateTemplateStatus: privateProcedure
		.input(updateTemplateStatusSchema)
		.mutation(async (opts) => {
			return await updateTemplateStatusHandler(opts);
		}),

	upsertTemplate: privateProcedure.input(upsertTemplateSchema).mutation(async (opts) => {
		return await upsertTemplateHandler(opts);
	})
});
