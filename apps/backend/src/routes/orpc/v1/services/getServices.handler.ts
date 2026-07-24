import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";
import { protectedBase } from "../../bases/protected";
import {
  getServicesInputSchema,
  getServicesOutputSchema,
} from "./getServices.schema";

export const getServicesHandler = protectedBase
  .route({ method: "GET" })
  .input(getServicesInputSchema)
  .output(getServicesOutputSchema)
  .handler(
    async ({
      input,
      context: {
        var: { drizzle: db },
        session,
      },
    }) => {
      // 1. Check of de ingelogde user lid is van deze organisatie
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

      // 2. Haal de services inclusief de gekoppelde members via de koppeltabel op
      const services = await db.query.service.findMany({
        where: eq(schema.service.organizationId, input.organizationId),
        with: {
          employeeServices: {
            with: {
              member: {
                with: {
                  user: true, // optioneel: als 'name' op de user tabel staat i.p.v. member
                },
              },
            },
          },
        },
      });

      // 3. Transformeer de data zodat 'employees' een simpele array wordt [{ id, name }]
      return services.map((service) => {
        const { employeeServices, ...rest } = service;

        return {
          ...rest,
          employees: employeeServices.map((es) => ({
            id: es.member.id,
            // Pak de naam van member of van de gekoppelde user
            name: es.member.user?.name ?? "",
          })),
        };
      });
    },
  );
