import { z } from 'zod';
import { router as createRouter, portalProcedure } from '../../context';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getOrganization } from '$lib/server/general';
import { DateTime, Interval } from 'luxon';
import { env } from '$lib/server/env';

import { getAvailabilitySchema } from './availability.schema';
import { getOccupancySchema } from './occupancy.schema';
import { createBookingSchema } from './booking.schema';
import { createBookingHandler } from './booking.handler';
import { getOccupancyHandler } from './occupancy.handler';
import { getAvailabilityHandler } from './availability.handler';
import { getAppointmentsSchema } from './appointments.schema';
import { getAppointmentsHandler } from './appointments.handler';
import { enqueueTemplateEmail } from '$lib/server/email-queue';

export const router = createRouter({
	getAvailability: portalProcedure.input(getAvailabilitySchema).query(async (opts) => {
		return await getAvailabilityHandler(opts);
	}),
	getOccupancy: portalProcedure.input(getOccupancySchema).query(async (opts) => {
		return await getOccupancyHandler(opts);
	}),
	getAppointments: portalProcedure.input(getAppointmentsSchema).query(async (opts) => {
		return await getAppointmentsHandler(opts);
	}),
	createBooking: portalProcedure.input(createBookingSchema).mutation(async (opts) => {
		return await createBookingHandler(opts);
	}),
	cancelAppointment: portalProcedure
		.input(z.object({ appointmentId: z.string() }))
		.mutation(async ({ input: { appointmentId, branchId }, ctx }) => {
			const customer = ctx.customer as any;
			const session = ctx.session as any;

			if (!customer?.id && !session?.user?.email) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'you_need_to_be_authenticated_to_cancel_an_appointment'
				});
			}
			//get branch
			const organization = await getOrganization(ctx.db, branchId);
			if (!organization) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'branch_not_found' });
			}

			// Find the calendar item and booking
			const calendarItem = await ctx.db.query.calendarItem.findFirst({
				where: (ci, { eq }) => eq(ci.id, appointmentId),
				with: {
					booking: {
						with: {
							customer: true,
							employee: {
								with: {
									user: true
								}
							}
						}
					}
				}
			});

			if (!calendarItem || !calendarItem.booking) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'appointment_not_found' });
			}

			const booking = calendarItem.booking;

			// Only allow cancel if the booking belongs to the customer (via customer ID or matched email)
			const isOwnerById = customer?.id && booking.customerId === customer.id;
			const isOwnerByEmail = session?.user?.email && booking.customer?.email === session.user.email;

			if (!isOwnerById && !isOwnerByEmail) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'not_allowed_to_cancel_this_appointment'
				});
			}

			// Check if the appointment has already passed
			const endTime = DateTime.fromJSDate(calendarItem.endTime);
			const now = DateTime.now();
			if (endTime < now) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'cannot_cancel_past_appointment'
				});
			}

			// Update booking status to CANCELLED
			await ctx.db
				.update(schema.booking)
				.set({ status: 'CANCELLED' })
				.where(eq(schema.booking.id, calendarItem.bookingId!));

			await enqueueTemplateEmail(ctx.emailQueue, {
				templateType: 'EMAIL_CANCELED',
				organizationId: branchId,
				bookingId: booking.id,
				targets: {
					customerEmail: booking.customer?.email,
					employeeEmail: booking.employee?.user?.email
				},
				origin: ctx.headers.get('origin') || ''
			});

			return { success: true };
		})
});
