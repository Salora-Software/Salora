import { z } from "zod";

export const updateOnboardingStepInputSchema = z.object({
  organizationId: z.string(),
  step: z.number().int().min(1).max(5),
});

export const updateOnboardingStepOutputSchema = z.object({
  success: z.boolean(),
});

export type UpdateOnboardingStepInput = z.infer<
  typeof updateOnboardingStepInputSchema
>;
export type UpdateOnboardingStepOutput = z.infer<
  typeof updateOnboardingStepOutputSchema
>;
