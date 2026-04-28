import { z } from 'zod';

export const getDashboardStatsSchema = z.object({
	organizationId: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional()
});

export type GetDashboardStatsInput = z.infer<typeof getDashboardStatsSchema>;
