import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq, exists } from "drizzle-orm";

import {
  createOrganizationInputSchema,
  createOrganizationOutputSchema,
} from "./createOrganisation.schema";
import { convertToSlug } from "@/lib/utils";
import { protectedBase } from "../../bases/protected";

// Helper om timezone te bepalen op basis van land
function getTimezoneFromCountry(country: string): string {
  const normalized = country.trim().toUpperCase();

  const timezoneMap: Record<string, string> = {
    NL: "Europe/Amsterdam",
    NETHERLANDS: "Europe/Amsterdam",
    NEDERLAND: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    BELGIUM: "Europe/Brussels",
    BELGIË: "Europe/Brussels",
    DE: "Europe/Berlin",
    GERMANY: "Europe/Berlin",
    DUITSLAND: "Europe/Berlin",
    FR: "Europe/Paris",
    FRANCE: "Europe/Paris",
    FRANKRIJK: "Europe/Paris",
    GB: "Europe/London",
    UK: "Europe/London",
    UNITED_KINGDOM: "Europe/London",
    US: "America/New_York",
    USA: "America/New_York",
  };

  return timezoneMap[normalized] ?? "Europe/Amsterdam"; // Fallback naar Europe/Amsterdam
}

export const createOrganizationHandler = protectedBase
  .route({ method: "POST" })
  .input(createOrganizationInputSchema)
  .output(createOrganizationOutputSchema)
  .handler(
    async ({
      input: { name, country, postalCode, streetNumber, city, street },
      context: {
        var: { drizzle: db, auth },
        session: { user },
        req,
      },
    }) => {
      const slug = convertToSlug(name);
      const headers = req.raw.headers;

      if (!slug) {
        throw new ORPCError("BAD_REQUEST", {
          message: "slug_can_not_be_empty",
        });
      }

      // 1. Check of de gebruiker niet al het max aantal organisaties heeft bereikt
      const userOrganizations = await db.query.organization.findMany({
        where: (org) =>
          exists(
            db
              .select()
              .from(schema.member)
              .where(
                and(
                  eq(schema.member.organizationId, org.id),
                  eq(schema.member.userId, user.id),
                ),
              ),
          ),
      });

      if (userOrganizations.length >= 5) {
        throw new ORPCError("BAD_REQUEST", {
          message: "max_organizations_reached",
        });
      }

      // 2. Check of de slug al bestaat
      const existingOrg = await db.query.organization.findFirst({
        where: (org, { eq }) => eq(org.slug, slug),
      });

      if (existingOrg) {
        throw new ORPCError("BAD_REQUEST", {
          message: "organization_slug_already_exists",
        });
      }

      // 3. Formateer adres en bepaal timezone
      const formattedLocation = `${street} ${streetNumber}, ${postalCode} ${city}, ${country}`;
      const timeZone = getTimezoneFromCountry(country);

      // 4. Maak de organisatie aan via Auth API
      const response = await auth.api
        .createOrganization({
          headers,
          body: {
            name,
            slug,
            timeZone,
            location: formattedLocation,
            email: user.email ?? "",
            phone: "",
            website: "",
            onboardingStep: 1,
          },
        })
        .catch((e: Error) => {
          throw new ORPCError("BAD_REQUEST", {
            message: e.message,
          });
        });

      if (!response) {
        throw new ORPCError("BAD_REQUEST", {
          message: "organization_creation_failed",
        });
      }

      // 5. Haal de aangemaakte organisatie op met alle relaties die het output schema verwacht
      const organization = await db.query.organization.findFirst({
        where: (org, { eq }) => eq(org.id, response.id),
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
        throw new ORPCError("BAD_REQUEST", {
          message: "organization_not_found",
        });
      }

      return organization;
    },
  );
