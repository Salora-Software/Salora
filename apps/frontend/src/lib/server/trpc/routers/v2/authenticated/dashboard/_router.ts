import { router as createRouter, privateProcedure } from '../../../../context';
import { getDashboardStatsSchema } from './get-dashboard-stats.schema';

export const router = createRouter({
	getDashboardStats: privateProcedure
		.input(getDashboardStatsSchema)
		.query(async (opts) => {
			const { getDashboardStatsHandler } = await import('./get-dashboard-stats.handler');
			return await getDashboardStatsHandler(opts);
		})
});
