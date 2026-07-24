import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { eq, exists } from "drizzle-orm";

import {
  getOrganizationsInputSchema,
  getOrganizationsOutputSchema,
} from "./getOrganisations.schema";
import { protectedBase } from "../../bases/protected";

export const getOrganizationsHandler = protectedBase
  .route({ method: "GET" })
  .input(getOrganizationsInputSchema)
  .output(getOrganizationsOutputSchema)
  .handler(
    async ({
      context: {
        var: { drizzle: db },
        session,
      },
    }) => {
      const organization = await db.query.organization.findMany({
        where: (org, { exists }) =>
          exists(
            db
              .select()
              .from(schema.member)
              .where(
                eq(schema.member.organizationId, org.id) &&
                  eq(schema.member.userId, session.user.id),
              ),
          ),
        with: {
          services: true,
          openingTimes: true,
          members: {
            with: {
              user: true,
            },
          },
        },
      });

      return organization;
    },
  );
