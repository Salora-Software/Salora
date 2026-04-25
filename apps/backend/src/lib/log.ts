import pino from "pino";

import type { Env } from "./env";

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    browser: {
      asObject: true,
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
