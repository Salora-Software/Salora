import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import {
	schema,
	bookingContactFields,
	parseRequiredBookingFields
} from '@salora/database';
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
				timeZone: z.string(),
				requiredBookingFields: z.array(z.enum(bookingContactFields))
			})
		)
		.query(async ({ input: { organizationId }, ctx: { db } }) => {
			const organization = await db.query.organization.findFirst({
				where: eq(schema.organization.id, organizationId),
				columns: {
					appointmentStatus: true,
					minimumBookingTime: true,
					bookingPeriod: true,
					autoShiftTimeSlot: true,
					timeZone: true,
					requiredBookingFields: true
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
				timeZone: organization.timeZone || 'Europe/Amsterdam',
				requiredBookingFields: parseRequiredBookingFields(organization.requiredBookingFields)
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
				timeZone: z.string(),
				requiredBookingFields: z.array(z.enum(bookingContactFields))
			})
		)
		.output(z.boolean())
		.mutation(async ({ ctx: { db }, input }) => {
			const {
				organizationId,
				appointmentStatus,
				minimumBookingTime,
				bookingPeriod,
				autoShiftTimeSlot,
				timeZone,
				requiredBookingFields
			} = input;

			const normalizedRequiredFields = parseRequiredBookingFields(
				JSON.stringify(requiredBookingFields)
			);

			const result = await db
				.update(schema.organization)
				.set({
					appointmentStatus,
					//@ts-ignore
					minimumBookingTime,
					bookingPeriod,
					autoShiftTimeSlot: autoShiftTimeSlot,
					timeZone,
					requiredBookingFields: JSON.stringify(normalizedRequiredFields)
				})
				.where(eq(schema.organization.id, organizationId))
				.returning({ id: schema.organization.id });

			if (result.length === 0) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });
			}
			return true;
		})
});
