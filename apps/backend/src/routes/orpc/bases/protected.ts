import { oo } from "@orpc/openapi";

import { base } from "./public";

import { authMiddleware } from "@/middleware/orpc/auth";

export const protectedBase = base
  .errors({
    UNAUTHORIZED: oo.spec(
      {
        status: 401,
        message: "Unauthorized",
      },
      {
        description: "Unauthorized - Authentication required",
      },
    ),
  })
  .use(authMiddleware);
