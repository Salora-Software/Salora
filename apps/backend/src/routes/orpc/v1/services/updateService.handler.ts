import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";
import { protectedBase } from "../../bases/protected";
import {
  updateServiceInputSchema,
  updateServiceOutputSchema,
} from "./updateService.schema";

export const updateServiceHandler = protectedBase
  .route({ method: "PATCH" })
  .input(updateServiceInputSchema)
  .output(updateServiceOutputSchema)
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

      // 2. Check of de service bestaat en bij deze organisatie hoort
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

      const { id, organizationId, employeeIds, ...updateData } = input;

      // 3. Update service en synchroniseer employee-koppelingen in een transactie
      await db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx
            .update(schema.service)
            .set(updateData)
            .where(eq(schema.service.id, id));
        }

        if (employeeIds !== undefined) {
          // Verwijder oude koppelingen
          await tx
            .delete(schema.employeeService)
            .where(eq(schema.employeeService.serviceId, id));

          // Voeg nieuwe koppelingen toe
          if (employeeIds.length > 0) {
            await tx.insert(schema.employeeService).values(
              employeeIds.map((memberId) => ({
                serviceId: id,
                memberId,
              })),
            );
          }
        }
      });

      // 4. Haal de bijgewerkte service op voor de output
      const updatedService = await db.query.service.findFirst({
        where: eq(schema.service.id, id),
        with: {
          employeeServices: {
            with: {
              member: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!updatedService) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Bijgewerkte service kon niet worden opgehaald.",
        });
      }

      const { employeeServices, ...rest } = updatedService;

      return {
        ...rest,
        employees: employeeServices.map((es) => ({
          id: es.member.id,
          name: es.member.user?.name ?? "",
        })),
      };
    },
  );
