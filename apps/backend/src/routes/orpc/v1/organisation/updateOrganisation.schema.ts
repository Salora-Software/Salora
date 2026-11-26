import { z } from "zod";

import { createOrganizationOutputSchema } from "./createOrganisation.schema";

export const updateOrganizationInputSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  country: z.string(),
  postalCode: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  street: z.string(),
});

export const updateOrganizationOutputSchema = createOrganizationOutputSchema;

export type UpdateOrganizationInput = z.infer<
  typeof updateOrganizationInputSchema
>;
export type UpdateOrganizationOutput = z.infer<
  typeof updateOrganizationOutputSchema
>;
