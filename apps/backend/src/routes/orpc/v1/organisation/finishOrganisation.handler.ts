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
