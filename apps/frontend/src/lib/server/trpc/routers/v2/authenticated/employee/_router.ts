import { router as createRouter, privateProcedure } from '../../../../context';
import { addTimeOffHandler } from './add-time-off.handler';
import { addTimeOffSchema } from './add-time-off.schema';
import { getTimeOffsHandler } from './get-time-offs.handler';
import { getTimeOffsSchema } from './get-time-offs.schema';
import { removeTimeOffHandler } from './remove-time-off.handler';
import { removeTimeOffSchema } from './remove-time-off.schema';

export const router = createRouter({
	addTimeOff: privateProcedure.input(addTimeOffSchema).mutation(async (opts) => {
		return await addTimeOffHandler(opts);
	}),

	getTimeOffs: privateProcedure.input(getTimeOffsSchema).query(async (opts) => {
		return await getTimeOffsHandler(opts);
	}),

	removeTimeOff: privateProcedure.input(removeTimeOffSchema).mutation(async (opts) => {
		return await removeTimeOffHandler(opts);
	})
});
