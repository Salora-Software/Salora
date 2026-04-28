import { z } from 'zod';

export const getCalendarSchema = z.object({
	organizationId: z.string(),
	startDate: z.date(),
	endDate: z.date()
});

export type GetCalendarInput = z.infer<typeof getCalendarSchema>;
