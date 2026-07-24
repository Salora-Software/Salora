import { ORPCError } from "@orpc/server";

import { base } from "@/routes/orpc/bases/public";

export const authMiddleware = base.middleware(
  async ({
    context: {
      var: { logger, auth },
      req,
    },
    next,
  }) => {
    console.log("authMiddleware called", req.raw.headers);
    const session = await auth.api.getSession({
      headers: req.raw.headers,
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const childLogger = logger
      .child({
        userId: session.user.id,
        sessionId: session.session.id,
      })
      .info("User authenticated");

    return next({
      context: {
        session,
        logger: childLogger,
      },
    });
  },
);
