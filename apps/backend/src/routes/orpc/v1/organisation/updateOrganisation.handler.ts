import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";

import { convertToSlug } from "@/lib/utils";
import { protectedBase } from "../../bases/protected";
import {
  updateOrganizationInputSchema,
  updateOrganizationOutputSchema,
} from "./updateOrganisation.schema";
import { getTimezoneFromCountry } from "./createOrganisation.handler";

export const updateOrganizationHandler = protectedBase
  .route({ method: "PATCH" })
  .input(updateOrganizationInputSchema)
  .output(updateOrganizationOutputSchema)
  .handler(
    async ({
      input: {
        organizationId,
        name,
        country,
        postalCode,
        streetNumber,
        city,
        street,
      },
      context: {
        var: { drizzle: db },
        session: { user },
      },
    }) => {
      const member = await db.query.member.findFirst({
        where: and(
          eq(schema.member.organizationId, organizationId),
          eq(schema.member.userId, user.id),
        ),
      });

      if (!member) {
        throw new ORPCError("FORBIDDEN", {
          message: "Je hebt geen toegang tot deze organisatie.",
        });
      }

      const existingOrganization = await db.query.organization.findFirst({
        where: eq(schema.organization.id, organizationId),
      });

      if (!existingOrganization) {
        throw new ORPCError("NOT_FOUND", { message: "organization_not_found" });
      }

      const slug = convertToSlug(name);

      if (!slug) {
        throw new ORPCError("BAD_REQUEST", {
          message: "slug_can_not_be_empty",
        });
      }

      if (slug !== existingOrganization.slug) {
        const slugOrganization = await db.query.organization.findFirst({
          where: eq(schema.organization.slug, slug),
        });

        if (slugOrganization && slugOrganization.id !== organizationId) {
          throw new ORPCError("BAD_REQUEST", {
            message: "organization_slug_already_exists",
          });
        }
      }

      const formattedLocation = `${street} ${streetNumber}, ${postalCode} ${city}, ${country}`;

      await db
        .update(schema.organization)
        .set({
          name,
          slug,
          location: formattedLocation,
          timeZone: getTimezoneFromCountry(country),
          metadata: JSON.stringify({
            country,
            postalCode,
            streetNumber,
            city,
            street,
          }),
        })
        .where(eq(schema.organization.id, organizationId));

      const organization = await db.query.organization.findFirst({
        where: eq(schema.organization.id, organizationId),
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
        throw new ORPCError("NOT_FOUND", { message: "organization_not_found" });
      }

      return organization;
    },
  );
