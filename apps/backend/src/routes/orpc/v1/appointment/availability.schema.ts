import { z } from 'zod';

import { luxonDate } from './luxon.schema';

export const getAvailabilityInputSchema = z.object({
	branchId: z.string(),
	serviceId: z.string(),
	date: luxonDate,
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilityInputSchema>;
