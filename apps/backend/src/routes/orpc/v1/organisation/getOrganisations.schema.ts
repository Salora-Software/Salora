import { z } from "zod";

export const getOrganizationsInputSchema = z.void();

export const getOrganizationsOutputSchema = z.array(
  z.object({
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
    onboardingStep: z.number().nullable(),
    services: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        description: z.string().nullable(),
        duration: z.number(),
      }),
    ),
    openingTimes: z.array(
      z.object({
        id: z.string(),
        organizationId: z.string(),
        dayOfWeek: z.number(),
        startTimeUtc: z.date(),
        endTimeUtc: z.date(),
        createdAt: z.date(),
        updatedAt: z.date(),
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
  }),
);

export type getOrganizationsInput = z.infer<typeof getOrganizationsInputSchema>;
export type getOrganizationsOutput = z.infer<
  typeof getOrganizationsOutputSchema
>;
