import { z } from "zod";

export const updateServiceInputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1, "Naam is verplicht").optional(),
  duration: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
  sortingIndex: z.number().optional(),
  employeeIds: z.array(z.string()).optional(),
});

export const updateServiceOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationId: z.string(),
  duration: z.number(),
  price: z.number(),
  sortingIndex: z.number(),
  employees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;
export type UpdateServiceOutput = z.infer<typeof updateServiceOutputSchema>;
