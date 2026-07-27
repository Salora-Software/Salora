import { z } from "zod";

export const getOrganizationInputSchema = z.object({
  id: z.string(),
});

export const getOrganizationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  timeZone: z.string(),
  location: z.string().nullable(),
  minimumBookingTime: z.number(),
  bookingPeriod: z.number(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      description: z.string().nullable(),
      duration: z.number(),
    }),
  ),
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      invitationStatus: z.string(),
      role: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullable(),
      }),
    }),
  ),
});

export type GetOrganizationInput = z.infer<typeof getOrganizationInputSchema>;
export type GetOrganizationOutput = z.infer<typeof getOrganizationOutputSchema>;
