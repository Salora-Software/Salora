import { z } from 'zod';

export const deleteCalendarItemSchema = z.object({
	id: z.string()
});

export type DeleteCalendarItemInput = z.infer<typeof deleteCalendarItemSchema>;
