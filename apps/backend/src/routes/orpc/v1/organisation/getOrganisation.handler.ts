import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { eq } from "drizzle-orm";

import { base } from "../../bases/public";
import {
  getOrganizationInputSchema,
  getOrganizationOutputSchema,
} from "./getOrganisation.schema";

export const getOrganizationHandler = base
  .route({ method: "GET" })
  .input(getOrganizationInputSchema)
  .output(getOrganizationOutputSchema)
  .handler(
    async ({
      input: { id },
      context: {
        var: { drizzle: db },
      },
    }) => {
      const organization = await db.query.organization.findFirst({
        where: eq(schema.organization.id, id),
        with: {
          services: true,
          members: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!organization) {
        throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
      }

      return {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        timeZone: organization.timeZone,
        location: organization.location,
        minimumBookingTime: organization.minimumBookingTime ?? 0,
        bookingPeriod: organization.bookingPeriod ?? 30,
        logo: organization.logo,
        website: organization.website,
        services: (organization.services || []).map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price ?? 0,
          description: service.description,
          duration: service.duration,
        })),
        members: organization.members || [],
      };
    },
  );
