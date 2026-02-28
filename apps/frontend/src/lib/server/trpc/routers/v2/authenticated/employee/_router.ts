import { router as createRouter, privateProcedure } from '../../../../context';
import { addTimeOffSchema } from './add-time-off.schema';
import { getTimeOffsSchema } from './get-time-offs.schema';
import { removeTimeOffSchema } from './remove-time-off.schema';

export const router = createRouter({
	addTimeOff: privateProcedure
		.input(addTimeOffSchema)
		.mutation(async (opts) => {
			const { addTimeOffHandler } = await import('./add-time-off.handler');
			return await addTimeOffHandler(opts);
		}),

	getTimeOffs: privateProcedure
		.input(getTimeOffsSchema)
		.query(async (opts) => {
			const { getTimeOffsHandler } = await import('./get-time-offs.handler');
			return await getTimeOffsHandler(opts);
		}),

	removeTimeOff: privateProcedure
		.input(removeTimeOffSchema)
		.mutation(async (opts) => {
			const { removeTimeOffHandler } = await import('./remove-time-off.handler');
			return await removeTimeOffHandler(opts);
		})
});
