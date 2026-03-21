import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { BookingStatus } from '@salora/database';

export const router = createRouter({
	getGeneralSettings: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.output(
			z.object({
				appointmentStatus: z.nativeEnum(BookingStatus),
				minimumBookingTime: z.number(),
				bookingPeriod: z.number(),
				autoShiftTimeSlot: z.boolean(),
				timeZone: z.string()
			})
		)
		.query(async ({ input: { organizationId } }) => {
			const organization = await db.query.organization.findFirst({
				where: eq(schema.organization.id, organizationId),
				columns: {
					appointmentStatus: true,
					minimumBookingTime: true,
					bookingPeriod: true,
					autoShiftTimeSlot: true,
					timeZone: true
				}
			});
			if (!organization) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });
			}
			return {
				appointmentStatus: organization.appointmentStatus || 'PENDING',
				minimumBookingTime: organization.minimumBookingTime || 0.5,
				bookingPeriod: organization.bookingPeriod || 365,
				autoShiftTimeSlot: organization.autoShiftTimeSlot ?? false,
				timeZone: organization.timeZone || 'Europe/Amsterdam'
			};
		}),

	updateGeneralSettings: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				appointmentStatus: z.nativeEnum(BookingStatus),
				minimumBookingTime: z.number(),
				bookingPeriod: z.number(),
				autoShiftTimeSlot: z.boolean(),
				timeZone: z.string()
			})
		)
		.output(z.boolean())
		.mutation(
			async ({
				input: {
					organizationId,
					appointmentStatus,
					minimumBookingTime,
					bookingPeriod,
					autoShiftTimeSlot,
					timeZone
				}
			}) => {
				const result = await db.update(schema.organization)
					.set({
						appointmentStatus,
						minimumBookingTime,
						bookingPeriod,
						autoShiftTimeSlot,
						timeZone
					})
					.where(eq(schema.organization.id, organizationId))
					.returning({ id: schema.organization.id });
				if (result.length === 0) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });
				}
				return true;
			}
		)
});
