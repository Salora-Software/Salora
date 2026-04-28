import { z } from 'zod';
import { router as createRouter, publicProcedure } from '@/middleware/trpc';
import { router as authenticatedRouter } from './authenticated/router';
import { eq } from 'drizzle-orm';
import { router as protectedRouter } from './protected/router';
import { schema } from '@salora/database';
import { TRPCError } from '@trpc/server';
import { CalendarDate } from '@internationalized/date';

import {
	transformTimeSlots,
	generateEmployeesTimeSlots,
	getOrganization
} from '@/lib/general';
import { DateTime, Interval } from 'luxon';

export const router = createRouter({
	ping: publicProcedure
		.input(z.void())
		.output(z.any())
		.query(async ({ }) => {
			return ' pong';
		}),
	getBranch: publicProcedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().nullable(),
				phone: z.string().nullable(),
				timeZone: z.string(),
				location: z.string().nullable(),
				minimumBookingTime: z.number(),
				bookingPeriod: z.number(),
				logo: z.string().nullable(),
				website: z.string().nullable(),
				services: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						price: z.number(),
						description: z.string().nullable(),
						duration: z.number()
					})
				),
				members: z.array(
					z.object({
						id: z.string(),
						userId: z.string(),
						user: z.object({
							id: z.string(),
							name: z.string(),
							email: z.string(),
							image: z.string().nullable()
						})
					})
				)
			})
		)
		.query(async ({ input: { id }, ctx: { db } }) => {
			// Haal de data parallel en plat op (voorkomt Cartesian product)
			const [orgResult, servicesResult, membersResult] = await Promise.all([
				db.select().from(schema.organization).where(eq(schema.organization.id, id)).limit(1),
				db.select().from(schema.service).where(eq(schema.service.organizationId, id)),
				db
					.select({
						member: schema.member,
						user: schema.user
					})
					.from(schema.member)
					.innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
					.where(eq(schema.member.organizationId, id))
			]);

			if (!orgResult.length) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}

			// Bouw het object direct op en pas de sorteringen toe
			const branch = {
				...orgResult[0],

				services: servicesResult.sort((a, b) => {
					if (a.sortingIndex === null && b.sortingIndex === null) return 0;
					if (a.sortingIndex === null) return 1;
					if (b.sortingIndex === null) return -1;
					return a.sortingIndex - b.sortingIndex;
				}),

				members: membersResult
					.map((row) => ({
						...row.member,
						user: row.user
					}))
					.sort((a, b) => {
						const roleOrder: Record<string, number> = { owner: 0, admin: 1, employee: 2 };
						const roleA = roleOrder[a.role] ?? 3;
						const roleB = roleOrder[b.role] ?? 3;

						if (roleA !== roleB) {
							return roleA - roleB;
						}

						const createdA = new Date(a.createdAt!).getTime();
						const createdB = new Date(b.createdAt!).getTime();
						return createdA - createdB;
					})
			};

			return branch;
		}),
	getTimeSlots: publicProcedure
		.input(
			z.object({
				branchId: z.string(),
				serviceId: z.string(),
				employeeIds: z.array(z.string()).optional(),
				dates: z
					.array(
						z.object({
							year: z.number(),
							month: z.number(),
							day: z.number()
						})
					)
					.min(1)
			})
		)
		.output(
			z.array(
				z.object({
					date: z.object({
						year: z.number(),
						month: z.number(),
						day: z.number()
					}),
					percentageBooked: z.number(),
					timeSlots: z.array(
						z.object({
							from: z.string(),
							to: z.string(),
							serviceId: z.string()
						})
					),
					availableSlots: z.array(z.string())
				})
			)
		)
		.query(async ({ input: { branchId, serviceId, dates, employeeIds }, ctx: { db } }) => {
			const calendarDates: CalendarDate[] = dates.map((date) => {
				return new CalendarDate(date.year, date.month, date.day);
			});
			const branch = await getOrganization(db, branchId);
			//New:
			const intervals: Interval[] = calendarDates.map((date) => {
				return Interval.fromDateTimes(
					DateTime.fromFormat(date.toString() + ' 00:00', 'yyyy-MM-dd HH:mm', {
						zone: branch.timeZone
					}),
					DateTime.fromFormat(date.toString() + ' 23:59', 'yyyy-MM-dd HH:mm', {
						zone: branch.timeZone
					})
				);
			});
			console.log('Intervals:', intervals);

			//Legacy:
			//loop through 	CalendarDate
			let timeSlots: Awaited<ReturnType<typeof generateEmployeesTimeSlots>> = [];
			for (const date of calendarDates) {
				//TODO: Fix having to loop instead of putting it in the interval timespan
				const generated = await generateEmployeesTimeSlots(
					db,
					branch,
					serviceId,
					employeeIds || [],
					Interval.fromDateTimes(
						DateTime.fromFormat(date.toString() + ' 00:00', 'yyyy-MM-dd HH:mm', {
							zone: branch.timeZone
						}),
						DateTime.fromFormat(date.toString() + ' 23:59', 'yyyy-MM-dd HH:mm', {
							zone: branch.timeZone
						})
					)
				);
				timeSlots = [...timeSlots, ...generated];
			}
			return transformTimeSlots(timeSlots);
		}),
	authenticated: authenticatedRouter,
	protected: protectedRouter
});
