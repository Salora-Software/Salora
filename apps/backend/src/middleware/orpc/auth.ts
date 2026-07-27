import { ORPCError } from "@orpc/server";
import { base } from "@/routes/orpc/bases/public";
import { schema } from "@salora/database";
import { and, eq } from "drizzle-orm";

export const authMiddleware = base.middleware(
  async (
    {
      context: {
        var: { logger, auth, drizzle: db },
        req,
      },
      next,
    },
    input?: unknown,
  ) => {
    const session = await auth.api.getSession({
      headers: req.raw.headers,
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Safely parse organizationId if input exists
    const organizationId =
      typeof input === "object" && input !== null && "organizationId" in input
        ? (input as { organizationId?: string }).organizationId
        : undefined;

    let memberRecord = null;

    if (organizationId) {
      memberRecord = await db.query.member.findFirst({
        where: and(
          eq(schema.member.organizationId, organizationId),
          eq(schema.member.userId, session.user.id),
        ),
      });

      if (!memberRecord) {
        throw new ORPCError("FORBIDDEN", {
          message: "User is not a member of this organization",
        });
      }
    }

    const childLogger = logger
      .child({
        userId: session.user.id,
        sessionId: session.session.id,
        ...(organizationId && { organizationId }),
      })
      .info("User authenticated");

    return next({
      context: {
        session,
        logger: childLogger,
        ...(memberRecord && { activeMember: memberRecord }),
      },
    });
  },
);
