import { z } from "zod";

export const getServicesInputSchema = z.object({ organizationId: z.string() });

export const getServicesOutputSchema = z.array(
  z.object({
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
  }),
);

export type getServicesInput = z.infer<typeof getServicesInputSchema>;
export type getServicesOutput = z.infer<typeof getServicesOutputSchema>;
