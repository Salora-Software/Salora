import { router as createRouter, privateProcedure } from '../../../../context';
import { deleteCalendarItemHandler } from './delete-calendar-item.handler';
import { deleteCalendarItemSchema } from './delete-calendar-item.schema';
import { getCalendarHandler } from './get-calendar.handler';
import { getCalendarSchema } from './get-calendar.schema';
import { updateCalendarItemHandler } from './update-calendar-item.handler';
import { updateCalendarItemSchema } from './update-calendar-item.schema';
import { upsertCalendarItemHandler } from './upsert-calendar-item.handler';
import { upsertCalendarItemSchema } from './upsert-calendar-item.schema';

export const router = createRouter({
	getCalendar: privateProcedure.input(getCalendarSchema).query(async (opts) => {
		return await getCalendarHandler(opts);
	}),

	updateCalendarItem: privateProcedure.input(updateCalendarItemSchema).mutation(async (opts) => {
		return await updateCalendarItemHandler(opts);
	}),

	upsertCalendarItem: privateProcedure.input(upsertCalendarItemSchema).mutation(async (opts) => {
		return await upsertCalendarItemHandler(opts);
	}),

	deleteCalendarItem: privateProcedure.input(deleteCalendarItemSchema).mutation(async (opts) => {
		return await deleteCalendarItemHandler(opts);
	})
});
