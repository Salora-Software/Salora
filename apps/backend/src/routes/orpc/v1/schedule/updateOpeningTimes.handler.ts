import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { eq, inArray } from "drizzle-orm";

import { convertToLocal, convertToUtc } from "@/lib/utils";
import { protectedBase } from "../../bases/protected";
import {
  updateOpeningTimesInputSchema,
  updateOpeningTimesOutputSchema,
} from "./updateOpeningTimes.schema";

export const updateOpeningTimesHandler = protectedBase
  .route({ method: "PATCH" })
  .input(updateOpeningTimesInputSchema)
  .output(updateOpeningTimesOutputSchema)
  .handler(
    async ({
      input,
      context: {
        var: { drizzle: db },
      },
    }) => {
      const { organizationId, openingTimes, removeItems } = input;

      const organization = await db
        .select({ timeZone: schema.organization.timeZone })
        .from(schema.organization)
        .where(eq(schema.organization.id, organizationId))
        .limit(1);

      if (!organization[0]) {
        throw new ORPCError("NOT_FOUND", { message: "organization_not_found" });
      }

      const timeZone = organization[0].timeZone;

      const updatedTimes = openingTimes.map((time) => ({
        id: time.id,
        dayOfWeek: time.dayOfWeek,
        startTimeUtc: convertToUtc(
          time.startTimeLocal,
          time.dayOfWeek,
          timeZone,
        ),
        endTimeUtc: convertToUtc(time.endTimeLocal, time.dayOfWeek, timeZone),
      }));

      for (const time of updatedTimes) {
        if (time.startTimeUtc > time.endTimeUtc) {
          throw new ORPCError("BAD_REQUEST", {
            message: "start_time_must_be_before_end_time",
          });
        }
      }

      if (removeItems && removeItems.length > 0) {
        await db
          .delete(schema.openingTime)
          .where(inArray(schema.openingTime.id, removeItems));
      }

      for (const time of updatedTimes) {
        if (time.id) {
          const [existing] = await db
            .select()
            .from(schema.openingTime)
            .where(eq(schema.openingTime.id, time.id))
            .limit(1);

          if (existing) {
            await db
              .update(schema.openingTime)
              .set({
                dayOfWeek: time.dayOfWeek,
                startTimeUtc: time.startTimeUtc,
                endTimeUtc: time.endTimeUtc,
              })
              .where(eq(schema.openingTime.id, time.id));
          } else {
            await db.insert(schema.openingTime).values({
              id: time.id,
              organizationId,
              dayOfWeek: time.dayOfWeek,
              startTimeUtc: time.startTimeUtc,
              endTimeUtc: time.endTimeUtc,
            });
          }
        } else {
          await db.insert(schema.openingTime).values({
            id: crypto.randomUUID(),
            organizationId,
            dayOfWeek: time.dayOfWeek,
            startTimeUtc: time.startTimeUtc,
            endTimeUtc: time.endTimeUtc,
          });
        }
      }

      const newOpeningTimes = await db
        .select()
        .from(schema.openingTime)
        .where(eq(schema.openingTime.organizationId, organizationId));

      return newOpeningTimes.map((time) => ({
        id: time.id,
        dayOfWeek: time.dayOfWeek,
        startTimeLocal: convertToLocal(time.startTimeUtc, timeZone),
        endTimeLocal: convertToLocal(time.endTimeUtc, timeZone),
      }));
    },
  );
