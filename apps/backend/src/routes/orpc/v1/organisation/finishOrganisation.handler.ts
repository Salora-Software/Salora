import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq, exists } from "drizzle-orm";

import {
  finishOrganizationInputSchema,
  finishOrganizationOutputSchema,
} from "./finishOrganisation.schema";
import { convertToSlug } from "@/lib/utils";
import { protectedBase } from "../../bases/protected";

export const finishOrganizationHandler = protectedBase
  .route({ method: "POST" })
  .input(finishOrganizationInputSchema)
  .output(finishOrganizationOutputSchema)
  .handler(
    async ({
      input: { organizationId },
      context: {
        var: { drizzle: db },
      },
    }) => {
      // update the organization to mark it as finished
      await db
        .update(schema.organization)
        .set({
          onboardingStep: null,
        })
        .where(eq(schema.organization.id, organizationId));

      return { success: true };
    },
  );
