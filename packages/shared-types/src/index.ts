import type { AppRouter as Router } from "../../../apps/frontend/src/lib/server/trpc/router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { router as ORPCRouterItem } from "../../../apps/backend/src/routes/orpc/_router";
import type { RouterClient } from "@orpc/server";

export type AppRouter = Router;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export type ORPCRouter = typeof ORPCRouterItem;
export type ORPCClient = RouterClient<ORPCRouter>;
