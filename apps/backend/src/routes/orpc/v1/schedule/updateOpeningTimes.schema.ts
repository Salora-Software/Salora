import { z } from "zod";

import { openingTimeOutputSchema } from "./getOpeningTimes.schema";

export const updateOpeningTimesInputSchema = z.object({
  organizationId: z.string(),
  openingTimes: z
    .array(
      z.object({
        id: z.string().optional(),
        dayOfWeek: z.number().min(0).max(7),
        startTimeLocal: z.string(),
        endTimeLocal: z.string(),
      }),
    )
    .max(20),
  removeItems: z.array(z.string()).optional(),
});

export const updateOpeningTimesOutputSchema = z.array(openingTimeOutputSchema);

export type UpdateOpeningTimesInput = z.infer<
  typeof updateOpeningTimesInputSchema
>;
export type UpdateOpeningTimesOutput = z.infer<
  typeof updateOpeningTimesOutputSchema
>;
