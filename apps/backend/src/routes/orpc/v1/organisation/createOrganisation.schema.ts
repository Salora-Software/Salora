import { z } from "zod";

export const createOrganizationInputSchema = z.object({
  name: z.string(),
  country: z.string(),
  postalCode: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  street: z.string(),
});

export const createOrganizationOutputSchema = z.object({
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
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullable(),
      }),
    }),
  ),
});

export type createOrganizationInput = z.infer<
  typeof createOrganizationInputSchema
>;
export type createOrganizationOutput = z.infer<
  typeof createOrganizationOutputSchema
>;
