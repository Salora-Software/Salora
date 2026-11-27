import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { and, eq, exists } from "drizzle-orm";

import { convertToLocal } from "@/lib/utils";
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
        where: (org) =>
          exists(
            db
              .select()
              .from(schema.member)
              .where(
                and(
                  eq(schema.member.organizationId, org.id),
                  eq(schema.member.userId, session.user.id),
                ),
              ),
          ),
        with: {
          services: true,
          openingTimes: true,
          members: {
            with: {
              user: true,
              availabilities: true,
              employeeServices: true,
            },
          },
        },
      });

      return organization.map((branch) => ({
        ...branch,
        openingTimes: branch.openingTimes.map((time) => ({
          ...time,
          startTimeLocal: convertToLocal(time.startTimeUtc, branch.timeZone),
          endTimeLocal: convertToLocal(time.endTimeUtc, branch.timeZone),
        })),
        members: branch.members.map((member) => ({
          ...member,
          availability: member.availabilities.map((time) => ({
            ...time,
            startTimeLocal: convertToLocal(
              new Date(time.startTimeUtc),
              branch.timeZone,
            ),
            endTimeLocal: convertToLocal(
              new Date(time.endTimeUtc),
              branch.timeZone,
            ),
          })),
          services: member.employeeServices.map((service) => service.serviceId),
        })),
      }));
    },
  );
