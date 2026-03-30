import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { schema } from '@salora/database';
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
		.query(async ({ input: { organizationId, timezone }, ctx: { db } }) => {
			const openingTimes = await db
				.select()
				.from(schema.openingTime)
				.where(schema.openingTime.organizationId.eq(organizationId));
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
		.mutation(async ({ ctx: { db }, input }) => {
			const { organizationId, openingTimes, removeItems } = input;

			// Get the organization's time zone
			const organization = await db
				.select({ timeZone: schema.organization.timeZone })
				.from(schema.organization)
				.where(schema.organization.id.eq(organizationId))
				.limit(1);
			if (!organization[0])
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'organization_not_found' });
			const timeZone = organization[0].timeZone;

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

			await db.transaction(async (trx) => {
				// Delete outdated opening times (only if removeItems has values)
				if (removeItems && removeItems.length > 0) {
					await trx.delete(schema.openingTime).where(schema.openingTime.id.in(removeItems));
				}

				// Upsert opening times (create/update)
				for (const time of updatedTimes) {
					if (time.id) {
						const existing = await trx
							.select()
							.from(schema.openingTime)
							.where(schema.openingTime.id.eq(time.id))
							.limit(1);
						if (existing.length > 0) {
							await trx
								.update(schema.openingTime)
								.set({
									dayOfWeek: time.dayOfWeek,
									startTimeUtc: time.startTimeUtc,
									endTimeUtc: time.endTimeUtc
								})
								.where(schema.openingTime.id.eq(time.id));
						} else {
							await trx.insert(schema.openingTime).values({
								id: time.id,
								organizationId,
								dayOfWeek: time.dayOfWeek,
								startTimeUtc: time.startTimeUtc,
								endTimeUtc: time.endTimeUtc
							});
						}
					} else {
						await trx.insert(schema.openingTime).values({
							organizationId,
							dayOfWeek: time.dayOfWeek,
							startTimeUtc: time.startTimeUtc,
							endTimeUtc: time.endTimeUtc
						});
					}
				}
			});
			// request the new opening times
			const newOpeningTimes = await db
				.select()
				.from(schema.openingTime)
				.where(schema.openingTime.organizationId.eq(organizationId));
			return newOpeningTimes.map((time) => ({
				id: time.id,
				dayOfWeek: time.dayOfWeek,
				startTimeLocal: convertToLocal(time.startTimeUtc, timeZone),
				endTimeLocal: convertToLocal(time.endTimeUtc, timeZone)
			}));
		})
});
