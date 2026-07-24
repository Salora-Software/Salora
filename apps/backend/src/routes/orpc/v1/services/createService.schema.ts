import { z } from "zod";

export const createServiceInputSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Naam is verplicht"),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
  sortingIndex: z.number().optional().default(0),
  employeeIds: z.array(z.string()).optional().default([]),
});

export const createServiceOutputSchema = z.object({
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

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;
export type CreateServiceOutput = z.infer<typeof createServiceOutputSchema>;
