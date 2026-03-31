import { router as createRouter, privateProcedure } from '../../../../context';
import { getDashboardStatsHandler } from './get-dashboard-stats.handler';
import { getDashboardStatsSchema } from './get-dashboard-stats.schema';

export const router = createRouter({
	getDashboardStats: privateProcedure.input(getDashboardStatsSchema).query(async (opts) => {
		return await getDashboardStatsHandler(opts);
	})
});
