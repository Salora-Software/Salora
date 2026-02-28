import { router as createRouter } from '../../../context';
import { router as organizationRouter } from './organization/_router';
import { router as userRouter } from './user/_router';
import { router as employeeRouter } from './employee/_router';
import { router as dashboardRouter } from './dashboard/_router';

export const router = createRouter({
	organization: organizationRouter,
	user: userRouter,
	employee: employeeRouter,
	dashboard: dashboardRouter
});
