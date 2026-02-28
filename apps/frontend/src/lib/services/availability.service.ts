import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import { prisma } from '$lib/server/prisma';
import {
	mapToBlockedPeriods,
	IntervalUtils,
	type BlockedPeriod,
	ConfiguredEngine
} from '@salora/scheduler';
import type { Prisma } from '@salora/database';

// 1. Datum-helper geïsoleerd
export const getIntervalsForDate = (
	shifts: { dayOfWeek: number; startTimeUtc: Date; endTimeUtc: Date }[],
	date: DateTime,
	timeZone: string
) => {
	const targetWeekday = date.weekday === 7 ? 0 : date.weekday;
	return shifts
		.filter((s) => s.dayOfWeek === targetWeekday)
		.map((s) => {
			const sStart = DateTime.fromJSDate(s.startTimeUtc, { zone: 'UTC' }).setZone(timeZone);
			const sEnd = DateTime.fromJSDate(s.endTimeUtc, { zone: 'UTC' }).setZone(timeZone);
			return Interval.fromDateTimes(
				date.set({ hour: sStart.hour, minute: sStart.minute }),
				date.set({ hour: sEnd.hour, minute: sEnd.minute })
			);
		})
		.filter((i) => i.isValid);
};

// 2. Data ophalen geïsoleerd
export const fetchBookingData = async (
	branchId: string,
	serviceId: string,
	searchSpan: Interval
) => {
	const [organization, service] = await Promise.all([
		prisma.organization.findUnique({
			where: { id: branchId },
			include: { openingTimes: true }
		}),
		prisma.service.findUnique({
			where: { id: serviceId }
		})
	]);

	if (!organization || !service) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Organisatie of dienst niet gevonden' });
	}

	const employees = await prisma.employeeService.findMany({
		where: { serviceId },
		include: {
			member: {
				include: {
					availability: true,
					calendarItems: {
						where: {
							startTime: { lt: searchSpan.end?.toJSDate() },
							endTime: { gt: searchSpan.start?.toJSDate() }
						}
					}
				}
			}
		}
	});

	return { organization, service, employees };
};

// 3. Logica per medewerker geïsoleerd
export const calculateEmployeeSlots = (
	employees: Prisma.EmployeeServiceGetPayload<{
		include: { member: { include: { availability: true; calendarItems: true } } };
	}>[],
	engine: ConfiguredEngine<any>,
	searchSpan: Interval,
	orgIntervals: Interval[],
	targetDate: DateTime,
	timeZone: string
) => {
	return employees.map(({ member }) => {
		const empIntervals = getIntervalsForDate(member.availability, targetDate, timeZone);
		const workingIntervals = IntervalUtils.intersect(orgIntervals, empIntervals);

		const unavailabilityBlocks: BlockedPeriod[] = IntervalUtils.subtract(
			[searchSpan],
			workingIntervals
		).map((i, idx) => ({
			id: `unavail-${member.id}-${idx}`,
			interval: i,
			metadata: { type: 'UNAVAILABLE' }
		}));

		const { intervals } = engine.getAvailableSlots({
			searchSpan,
			blockedPeriods: [
				...unavailabilityBlocks,
				...mapToBlockedPeriods(member.calendarItems, 'type')
			]
		});

		return {
			employeeId: member.id,
			intervals,
			calendarItems: mapToBlockedPeriods(member.calendarItems, 'type').flatMap((b) => b.interval)
		};
	});
};
