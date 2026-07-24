import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";
import { protectedBase } from "../../bases/protected";
import {
  deleteServiceInputSchema,
  deleteServiceOutputSchema,
} from "./deleteService.schema";

export const deleteServiceHandler = protectedBase
  .route({ method: "DELETE" })
  .input(deleteServiceInputSchema)
  .output(deleteServiceOutputSchema)
  .handler(
    async ({
      input,
      context: {
        var: { drizzle: db },
        session,
      },
    }) => {
      // 1. Check toegang tot de organisatie
      const member = await db.query.member.findFirst({
        where: and(
          eq(schema.member.organizationId, input.organizationId),
          eq(schema.member.userId, session.user.id),
        ),
      });

      if (!member) {
        throw new ORPCError("FORBIDDEN", {
          message: "Je hebt geen toegang tot deze organisatie.",
        });
      }

      // 2. Check of de service bestaat binnen deze organisatie
      const existingService = await db.query.service.findFirst({
        where: and(
          eq(schema.service.id, input.id),
          eq(schema.service.organizationId, input.organizationId),
        ),
      });

      if (!existingService) {
        throw new ORPCError("NOT_FOUND", {
          message: "Service niet gevonden.",
        });
      }

      // 3. Verwijder de service (employee_service records cascaden automatisch)
      await db.delete(schema.service).where(eq(schema.service.id, input.id));

      return {
        success: true,
        id: input.id,
      };
    },
  );
