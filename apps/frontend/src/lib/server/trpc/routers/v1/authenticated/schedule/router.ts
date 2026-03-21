import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { prisma } from '$lib/server/prisma';
import { TRPCError } from '@trpc/server';
import { convertToLocal, convertToUtc } from '$lib/utils';

export const router = createRouter({
	getOpeningTimes: privateProcedure
		.input(z.object({ organizationId: z.string(), timezone: z.string().optional() }))
		.output(
			z.array(
				z.object({
					id: z.string(),
					dayOfWeek: z.number(),
					startTimeLocal: z.string(),
					endTimeLocal: z.string()
				})
			)
		)
		.query(async ({ input: { organizationId, timezone } }) => {
			const openingTimes = await prisma.openingTime.findMany({
				where: {
					organizationId
				}
			});
			return openingTimes.map((time) => ({
				id: time.id,
				dayOfWeek: time.dayOfWeek,
				startTimeLocal: convertToLocal(time.startTimeUtc, timezone || 'Europe/Amsterdam'),
				endTimeLocal: convertToLocal(time.endTimeUtc, timezone || 'Europe/Amsterdam')
			}));
		}),

	updateOpeningTimes: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				openingTimes: z
					.array(
						z.object({
							id: z.string().optional(),
							dayOfWeek: z.number().min(0).max(7),
							startTimeLocal: z.string(), // Format: "HH:mm"
							endTimeLocal: z.string() // Format: "HH:mm"
						})
					)
					.max(20),
				removeItems: z.array(z.string()).optional()
			})
		)
		.output(
			z.array(
				z.object({
					id: z.string(),
					dayOfWeek: z.number(),
					startTimeLocal: z.string(),
					endTimeLocal: z.string()
				})
			)
		)
		.mutation(async ({ ctx, input }) => {
			const { organizationId, openingTimes, removeItems } = input;

			// Get the organization's time zone
			const organization = await prisma.organization.findUnique({
				where: { id: organizationId },
				select: { timeZone: true }
			});

			if (!organization)
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });

			const timeZone = organization.timeZone;

			// Convert local times to UTC
			const updatedTimes = openingTimes.map((time) => ({
				id: time.id,
				dayOfWeek: time.dayOfWeek,
				startTimeUtc: convertToUtc(time.startTimeLocal, time.dayOfWeek, timeZone),
				endTimeUtc: convertToUtc(time.endTimeLocal, time.dayOfWeek, timeZone)
			}));
			//check for each if the start time is before the end time
			for (let time of updatedTimes) {
				if (time.startTimeUtc > time.endTimeUtc)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'start_time_must_be_before_end_time'
					});
			}

			await prisma.$transaction([
				// Delete outdated opening times (only if removeItems has values)
				...(removeItems && removeItems.length > 0
					? [
							prisma.openingTime.deleteMany({
								where: { id: { in: removeItems } }
							})
						]
					: []),

				// Upsert opening times (create/update)
				...updatedTimes.map((time) =>
					prisma.openingTime.upsert({
						where: {
							organizationId: organizationId,
							id: time.id || ''
						},
						update: {
							dayOfWeek: time.dayOfWeek,
							startTimeUtc: time.startTimeUtc,
							endTimeUtc: time.endTimeUtc
						},
						create: {
							organizationId,
							dayOfWeek: time.dayOfWeek,
							startTimeUtc: time.startTimeUtc,
							endTimeUtc: time.endTimeUtc
						}
					})
				)
			]);
			// request the new opening times
			const newOpeningTimes = await prisma.openingTime.findMany({
				where: {
					organizationId
				}
			});
			return newOpeningTimes.map((time) => ({
				id: time.id,
				dayOfWeek: time.dayOfWeek,
				startTimeLocal: convertToLocal(time.startTimeUtc, timeZone),
				endTimeLocal: convertToLocal(time.endTimeUtc, timeZone)
			}));
		})
});
