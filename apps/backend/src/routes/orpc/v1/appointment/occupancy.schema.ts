import { z } from "zod";

import { luxonInterval } from "./luxon.schema";

export const getOccupancyInputSchema = z.object({
  branchId: z.string(),
  serviceId: z.string(),
  range: luxonInterval,
});

export type GetOccupancyInput = z.infer<typeof getOccupancyInputSchema>;
