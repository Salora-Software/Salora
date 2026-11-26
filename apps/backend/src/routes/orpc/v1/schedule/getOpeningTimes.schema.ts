import { z } from "zod";

export const getOpeningTimesInputSchema = z.object({
  organizationId: z.string(),
  timezone: z.string().optional(),
});

export const openingTimeOutputSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number(),
  startTimeLocal: z.string(),
  endTimeLocal: z.string(),
});

export const getOpeningTimesOutputSchema = z.array(openingTimeOutputSchema);

export type GetOpeningTimesInput = z.infer<typeof getOpeningTimesInputSchema>;
export type GetOpeningTimesOutput = z.infer<typeof getOpeningTimesOutputSchema>;
