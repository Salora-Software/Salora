import { ORPCError } from "@orpc/server";
import { schema } from "@salora/database";
import { eq } from "drizzle-orm";

import { convertToLocal } from "@/lib/utils";
import { protectedBase } from "../../bases/protected";
import {
  getOpeningTimesInputSchema,
  getOpeningTimesOutputSchema,
} from "./getOpeningTimes.schema";

export const getOpeningTimesHandler = protectedBase
  .route({ method: "GET" })
  .input(getOpeningTimesInputSchema)
  .output(getOpeningTimesOutputSchema)
  .handler(
    async ({
      input: { organizationId, timezone },
      context: {
        var: { drizzle: db },
      },
    }) => {
      const openingTimes = await db
        .select()
        .from(schema.openingTime)
        .where(eq(schema.openingTime.organizationId, organizationId));

      return openingTimes.map((time) => ({
        id: time.id,
        dayOfWeek: time.dayOfWeek,
        startTimeLocal: convertToLocal(
          time.startTimeUtc,
          timezone || "Europe/Amsterdam",
        ),
        endTimeLocal: convertToLocal(
          time.endTimeUtc,
          timezone || "Europe/Amsterdam",
        ),
      }));
    },
  );
