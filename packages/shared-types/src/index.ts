import type { AppRouter as Router } from "../../../apps/frontend/src/lib/server/trpc/router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { router as ORPCRouterItem } from "../../../apps/backend/src/routes/orpc/_router";
import type { InferRouterInputs, InferRouterOutputs, RouterClient } from "@orpc/server";
export { orpcCustomJsonSerializers } from './orpc';

export type AppRouter = Router;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export type ORPCRouter = typeof ORPCRouterItem;
export type ORPCClient = RouterClient<ORPCRouter>;
export type ORPCRouterInput = InferRouterInputs<ORPCRouter>;
export type ORPCRouterOutput = InferRouterOutputs<ORPCRouter>;

export type OccupancyOutput = ORPCRouterOutput['v1']['appointment']['getOccupancy'];
export type AvailabilityOutput = ORPCRouterOutput['v1']['appointment']['getAvailability'];
export type CreateBookingOutput = ORPCRouterOutput['v1']['appointment']['createBooking'];
