import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";
import { protectedBase } from "../../bases/protected";
import {
  createServiceInputSchema,
  createServiceOutputSchema,
} from "./createService.schema";

export const createServiceHandler = protectedBase
  .route({ method: "POST" })
  .input(createServiceInputSchema)
  .output(createServiceOutputSchema)
  .handler(
    async ({
      input,
      context: {
        var: { drizzle: db },
        session,
      },
    }) => {
      // 1. Check member toegang
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

      // 2. Insert service
      const [newService] = await db
        .insert(schema.service)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          duration: input.duration,
          price: input.price,
          sortingIndex: input.sortingIndex,
        })
        .returning();

      // 3. Koppel employees (indien aanwezig)
      if (input.employeeIds.length > 0) {
        await db.insert(schema.employeeService).values(
          input.employeeIds.map((memberId) => ({
            serviceId: newService.id,
            memberId,
          })),
        );
      }

      // 4. Ophalen inclusief relaties
      const fullService = await db.query.service.findFirst({
        where: eq(schema.service.id, newService.id),
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

      if (!fullService) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Aangemaakte service kon niet worden opgehaald.",
        });
      }

      const { employeeServices, ...rest } = fullService;

      return {
        ...rest,
        employees: employeeServices.map((es) => ({
          id: es.member.id,
          name: es.member.user?.name ?? "",
        })),
      };
    },
  );
