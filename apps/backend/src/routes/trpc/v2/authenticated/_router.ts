import { router as createRouter } from '@/middleware/trpc';;
import { router as organizationRouter } from './organization/_router';
import { router as userRouter } from './user/_router';
import { router as employeeRouter } from './employee/_router';
import { router as dashboardRouter } from './dashboard/_router';
import { router as customersRouter } from './customers/_router';
import { router as calendarRouter } from './calendar/_router';
import { router as communicationRouter } from './communication/_router';

export const router = createRouter({
	organization: organizationRouter,
	user: userRouter,
	employee: employeeRouter,
	dashboard: dashboardRouter,
	customers: customersRouter,
	calendar: calendarRouter,
	communication: communicationRouter
});
