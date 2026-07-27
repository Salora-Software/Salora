import { z } from "zod";

export const finishOrganizationInputSchema = z.object({
  organizationId: z.string(),
});

export const finishOrganizationOutputSchema = z.object({
  success: z.boolean(),
});

export type finishOrganizationInput = z.infer<
  typeof finishOrganizationInputSchema
>;
export type finishOrganizationOutput = z.infer<
  typeof finishOrganizationOutputSchema
>;
