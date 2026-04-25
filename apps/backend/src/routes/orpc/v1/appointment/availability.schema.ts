import { z } from "zod";

import { luxonDate, luxonInterval } from "../../schemas/luxon.schema";

export const getAvailabilityInputSchema = z.object({
	branchId: z.string(),
	serviceId: z.string(),
	date: luxonDate,
});

export const getAvailabilityOutputSchema = z.object({
	date: luxonDate.nullable(),
	slots: z.array(
		z.object({
			interval: luxonInterval,
			availableCapacity: z.number(),
			available: z.boolean(),
			availableEmployees: z.array(z.string()),
		})
	),
	blocked: z.array(
		z.object({
			interval: luxonInterval,
			type: z.string(),
		})
	),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilityInputSchema>;
export type GetAvailabilityOutput = z.infer<typeof getAvailabilityOutputSchema>;