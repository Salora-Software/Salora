import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const router = createRouter({
	getGeneralSettings: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.output(
			z.object({
				appointmentStatus: z.string(),
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
				minimumBookingTime: Number(organization.minimumBookingTime) || 0.5,
				bookingPeriod: organization.bookingPeriod || 365,
				autoShiftTimeSlot: !!organization.autoShiftTimeSlot,
				timeZone: organization.timeZone || 'Europe/Amsterdam'
			};
		}),

	updateGeneralSettings: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				appointmentStatus: z.string(),
				minimumBookingTime: z.number(),
				bookingPeriod: z.number(),
				autoShiftTimeSlot: z.boolean(),
				timeZone: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ ctx, input }) => {
			const {
				organizationId,
				appointmentStatus,
				minimumBookingTime,
				bookingPeriod,
				autoShiftTimeSlot,
				timeZone
			} = input;

			const result = await db
				.update(schema.organization)
				.set({
					appointmentStatus,
					//@ts-ignore
					minimumBookingTime,
					bookingPeriod,
					autoShiftTimeSlot: autoShiftTimeSlot ? 1 : 0,
					timeZone
				})
				.where(eq(schema.organization.id, organizationId))
				.returning({ id: schema.organization.id });

			if (result.length === 0) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });
			}
			return true;
		})
});
