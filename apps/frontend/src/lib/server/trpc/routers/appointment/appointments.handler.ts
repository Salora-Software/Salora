import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { DateTime } from 'luxon';
import type { GetAppointmentsInput } from './appointments.schema';
import type { PortalContext } from '../../context';

type GetAppointmentsOpts = {
	ctx: PortalContext;
	input: GetAppointmentsInput;
};

export const getAppointmentsHandler = async ({
	input: { email: inputEmail, branchId },
	ctx: { db, customer, session }
}: GetAppointmentsOpts) => {
	// If the user is authenticated as a customer, we ensure they only fetch their own appointments
	// If not authenticated (e.g. initial lookup via email), we filter by the provided email.

	const targetCustomerId = customer?.id;
	const sessionEmail = session?.user?.email;
	const email = sessionEmail || inputEmail;

	if (!targetCustomerId && (!email || email.trim() === '')) {
		// If no session and no email provided, we cannot look up appointments safely
		return [];
	}

	const appointments = await db.query.calendarItem.findMany({
		where: (ci, { eq, and }) => and(eq(ci.organizationId, branchId), eq(ci.type, 'BOOKING')),
		with: {
			booking: {
				with: {
					customer: true,
					service: true,
					employee: {
						with: {
							user: true
						}
					}
				}
			}
		},
		orderBy: (ci, { desc }) => desc(ci.startTime)
	});

	// If no authenticated customer ID, we verify the email matches the booking's customer email
	// and only return if there's a match to prevent leaking info.
	const filteredAppointments = appointments.filter((app) => {
		if (targetCustomerId && app.booking?.customerId === targetCustomerId) return true;
		return app.booking?.customer?.email === email;
	});

	// Mark past appointments as COMPLETED
	const now = DateTime.now();
	return filteredAppointments.map((app) => {
		const endTime = DateTime.fromJSDate(app.endTime);
		if (
			endTime < now &&
			app.booking?.status !== 'COMPLETED' &&
			app.booking?.status !== 'CANCELLED'
		) {
			// If the appointment has ended, override status to COMPLETED
			return {
				...app,
				booking: app.booking ? { ...app.booking, status: 'COMPLETED' } : null
			};
		}
		return app;
	});
};
