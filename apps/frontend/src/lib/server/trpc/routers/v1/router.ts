import { z } from 'zod';
import { router as createRouter, publicProcedure } from '../../context';
import { router as authenticatedRouter } from './authenticated/router';
import { router as protectedRouter } from './protected/router';
import { db, schema } from '$lib/server/db';
import { TRPCError } from '@trpc/server';
import { CalendarDate } from '@internationalized/date';
import { convertToLocal, generateTimeSlots } from '$lib/utils';
import type { OpeningTime, TimeSlot } from '$lib/types';
import {
	transformTimeSlots,
	generateEmployeesTimeSlots,
	getOrganization
} from '$lib/server/general';
import { DateTime, Interval } from 'luxon';

export const router = createRouter({
	ping: publicProcedure
		.input(z.void())
		.output(z.any())
		.query(async ({}) => {
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
						name: z.string(),
						image: z.string().nullable(),
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
		.query(async ({ input: { id } }) => {
			import { eq } from 'drizzle-orm';

			const orgRows = await db
				.select({
					organization: schema.organization,
					service: schema.service,
					member: schema.member,
					user: schema.user
				})
				.from(schema.organization)
				.leftJoin(schema.service, eq(schema.service.organizationId, schema.organization.id))
				.leftJoin(schema.member, eq(schema.member.organizationId, schema.organization.id))
				.leftJoin(schema.user, eq(schema.user.id, schema.member.userId))
				.where(eq(schema.organization.id, id));

			if (!orgRows.length || !orgRows[0].organization) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}

			// Flatten and group services and members
			const org = orgRows[0].organization;
			const servicesMap = new Map();
			const membersMap = new Map();

			for (const row of orgRows) {
				if (row.service && row.service.id) {
					servicesMap.set(row.service.id, row.service);
				}
				if (row.member && row.member.id) {
					const memberId = row.member.id;
					if (!membersMap.has(memberId)) {
						membersMap.set(memberId, {
							...row.member,
							user: row.user && row.user.id ? row.user : null
						});
					}
				}
			}

			const branch = {
				...org,
				services: Array.from(servicesMap.values()),
				members: Array.from(membersMap.values())
			};

			//sort branch.services by sortingIndex
			branch.services = branch.services.sort((a, b) => {
				if (a.sortingIndex === null && b.sortingIndex === null) {
					return 0;
				}
				if (a.sortingIndex === null) {
					return 1;
				}
				if (b.sortingIndex === null) {
					return -1;
				}
				return a.sortingIndex - b.sortingIndex;
			});
			//also sort branch.members by their role and creation date so the owner is first, then admins, then employees and the oldest member is first
			const roleOrder = { owner: 0, admin: 1, employee: 2 };
			branch.members = branch.members.sort((a, b) => {
				const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
				const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
				if (roleA !== roleB) {
					return roleA - roleB;
				}
				const createdA = new Date(a.createdAt).getTime();
				const createdB = new Date(b.createdAt).getTime();
				return createdA - createdB;
			});

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
		.query(async ({ input: { branchId, serviceId, dates, employeeIds } }) => {
			const calendarDates: CalendarDate[] = dates.map((date) => {
				return new CalendarDate(date.year, date.month, date.day);
			});
			const branch = await getOrganization(branchId);
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
