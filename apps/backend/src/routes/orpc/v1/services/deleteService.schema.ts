import { z } from "zod";

export const deleteServiceInputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
});

export const deleteServiceOutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export type DeleteServiceInput = z.infer<typeof deleteServiceInputSchema>;
export type DeleteServiceOutput = z.infer<typeof deleteServiceOutputSchema>;
