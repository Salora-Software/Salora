import { ORPCError } from '@orpc/server';
import { DateTime } from 'luxon';
import { schema } from '@salora/database';
import { eq } from 'drizzle-orm';

import { protectedBase } from '../../bases/protected';
import { enqueueTemplateEmail } from '@/lib/email-queue';

import { cancelAppointmentInputSchema } from './booking.schema';

export const cancelAppointmentHandler = protectedBase
	.route({ method: 'POST' })
	.input(cancelAppointmentInputSchema)
	.handler(async ({ input: { appointmentId, branchId }, context: { var: { drizzle: db, auth, emailQueue }, req } }) => {
		const url = new URL(req.url);

		const session = await auth.api.getSession({
			headers: req.header(),
		});

		if (!session) {
			throw new ORPCError('UNAUTHORIZED', {
				message: 'you_need_to_be_authenticated_to_cancel_an_appointment',
			});
		}

		const customer = await db.query.customer.findFirst({
			where: (customerTable, { eq }) => eq(customerTable.userId, session.user.id),
		});

		const organization = await db.query.organization.findFirst({
			where: (organizationTable, { eq }) => eq(organizationTable.id, branchId),
		});

		if (!organization) {
			throw new ORPCError('NOT_FOUND', { message: 'branch_not_found' });
		}

		const calendarItem = await db.query.calendarItem.findFirst({
			where: (calendarItemTable, { eq }) => eq(calendarItemTable.id, appointmentId),
			with: {
				booking: {
					with: {
						customer: true,
						employee: {
							with: {
								user: true,
							},
						},
					},
				},
			},
		});

		if (!calendarItem || !calendarItem.booking) {
			throw new ORPCError('NOT_FOUND', { message: 'appointment_not_found' });
		}

		const booking = calendarItem.booking;

		const isOwnerById = Boolean(customer?.id && booking.customerId === customer.id);
		const isOwnerByEmail = Boolean(
			session.user?.email &&
			booking.customer?.email === session.user.email,
		);

		if (!isOwnerById && !isOwnerByEmail) {
			throw new ORPCError('FORBIDDEN', {
				message: 'not_allowed_to_cancel_this_appointment',
			});
		}

		const endTime = DateTime.fromJSDate(calendarItem.endTime);
		const now = DateTime.now();
		if (endTime < now) {
			throw new ORPCError('BAD_REQUEST', {
				message: 'cannot_cancel_past_appointment',
			});
		}

		await db
			.update(schema.booking)
			.set({ status: 'CANCELLED' })
			.where(eq(schema.booking.id, calendarItem.bookingId!));

		await enqueueTemplateEmail(emailQueue, {
			templateType: 'EMAIL_CANCELED',
			organizationId: branchId,
			bookingId: booking.id,
			targets: {
				customerEmail: booking.customer?.email,
				employeeEmail: booking.employee?.user?.email,
			},
			origin: url.origin || '',
		});

		return { success: true };
	});