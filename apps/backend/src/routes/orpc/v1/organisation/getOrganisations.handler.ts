import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { eq } from "drizzle-orm";

import { base } from "../../bases/public";
import {
  getOrganizationsInputSchema,
  getOrganizationsOutputSchema,
} from "./getOrganisations.schema";

export const getOrganizationsHandler = base
  .route({ method: "GET" })
  .input(getOrganizationsInputSchema)
  .output(getOrganizationsOutputSchema)
  .handler(
    async ({
      context: {
        var: { drizzle: db },
      },
    }) => {
      const organization = await db.query.organization.findMany({
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
