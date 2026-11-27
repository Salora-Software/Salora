import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { schema } from "@salora/database";

import { protectedBase } from "../../bases/protected";
import {
  updateOnboardingStepInputSchema,
  updateOnboardingStepOutputSchema,
} from "./updateOnboardingStep.schema";

export const updateOnboardingStepHandler = protectedBase
  .route({ method: "POST" })
  .input(updateOnboardingStepInputSchema)
  .output(updateOnboardingStepOutputSchema)
  .handler(
    async ({
      input: { organizationId, step },
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

      await db
        .update(schema.organization)
        .set({ onboardingStep: step })
        .where(eq(schema.organization.id, organizationId));

      return { success: true };
    },
  );
