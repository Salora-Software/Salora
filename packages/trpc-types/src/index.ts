import type { AppRouter as Router } from "../../../apps/frontend/src/lib/server/trpc/router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type AppRouter = Router;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
