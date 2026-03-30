import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../context';
import { router as communicationRouter } from './communication/router';
import { router as dashboardRouter } from './dashboard/router';
import { router as organizationRouter } from './organization/router';
import { router as servicesRouter } from './services/router';
import { router as employeesRouter } from './employees/router';
import { router as customersRouter } from './customers/router';
import { router as scheduleRouter } from './schedule/router';
import { router as settingsRouter } from './settings/router';
import { router as calendarRouter } from './calendar/router';
import { router as userRouter } from './user/router';

export const router = createRouter({
	ping: privateProcedure.query(async ({ ctx }) => {
		return true;
	}),

	// Nested routers
	organization: organizationRouter,
	services: servicesRouter,
	employees: employeesRouter,
	customers: customersRouter,
	schedule: scheduleRouter,
	settings: settingsRouter,
	calendar: calendarRouter,
	user: userRouter,
	communication: communicationRouter,
	dashboard: dashboardRouter
});
