import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { schema } from '@salora/database';
import { TRPCError } from '@trpc/server';
import { convertToLocal, convertToUtc } from '$lib/utils';
import { eq, inArray } from 'drizzle-orm';

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
				.where(eq(schema.openingTime.organizationId, organizationId));
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

			console.log('updating');

			// Get the organization's time zone
			const organization = await db
				.select({ timeZone: schema.organization.timeZone })
				.from(schema.organization)
				.where(eq(schema.organization.id, organizationId))
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
			console.log('updatedTimes', updatedTimes);
			//check for each if the start time is before the end time
			for (let time of updatedTimes) {
				if (time.startTimeUtc > time.endTimeUtc)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'start_time_must_be_before_end_time'
					});
			}

			// 1. Delete items
			if (removeItems && removeItems.length > 0) {
				await db.delete(schema.openingTime).where(inArray(schema.openingTime.id, removeItems));
			}

			// 2. Perform Upserts
			for (const time of updatedTimes) {
				if (time.id) {
					// Using upsert (onConflictUpdate) if supported by your Drizzle/D1 setup
					// or keeping the select/update logic if that's preferred for D1 stability
					const [existing] = await db
						.select()
						.from(schema.openingTime)
						.where(eq(schema.openingTime.id, time.id))
						.limit(1);

					if (existing) {
						await db
							.update(schema.openingTime)
							.set({
								dayOfWeek: time.dayOfWeek,
								startTimeUtc: time.startTimeUtc,
								endTimeUtc: time.endTimeUtc
							})
							.where(eq(schema.openingTime.id, time.id));
					} else {
						await db.insert(schema.openingTime).values({
							id: time.id,
							organizationId,
							dayOfWeek: time.dayOfWeek,
							startTimeUtc: time.startTimeUtc,
							endTimeUtc: time.endTimeUtc
						});
					}
				} else {
					await db.insert(schema.openingTime).values({
						id: crypto.randomUUID(),
						organizationId,
						dayOfWeek: time.dayOfWeek,
						startTimeUtc: time.startTimeUtc,
						endTimeUtc: time.endTimeUtc
					});
				}
			}

			// request the new opening times
			const newOpeningTimes = await db
				.select()
				.from(schema.openingTime)
				.where(eq(schema.openingTime.organizationId, organizationId));
			return newOpeningTimes.map((time) => ({
				id: time.id,
				dayOfWeek: time.dayOfWeek,
				startTimeLocal: convertToLocal(time.startTimeUtc, timeZone),
				endTimeLocal: convertToLocal(time.endTimeUtc, timeZone)
			}));
		})
});
