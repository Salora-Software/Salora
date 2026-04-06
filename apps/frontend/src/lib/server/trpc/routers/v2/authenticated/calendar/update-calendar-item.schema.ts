import { z } from 'zod';

export const updateCalendarItemSchema = z.object({
	id: z.string(),
	startTime: z.date(),
	endTime: z.date()
});

export type UpdateCalendarItemInput = z.infer<typeof updateCalendarItemSchema>;
