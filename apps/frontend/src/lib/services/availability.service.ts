import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import { schema, type DatabaseType } from '@salora/database';
import { eq, and, gt, lt } from 'drizzle-orm';
import {
	mapToBlockedPeriods,
	IntervalUtils,
	type BlockedPeriod,
	ConfiguredEngine
} from '@salora/scheduler';

// 1. Datum-helper geïsoleerd
export const getIntervalsForDate = (
	shifts: { dayOfWeek: number; startTimeUtc: string | Date; endTimeUtc: string | Date }[],
	date: DateTime,
	timeZone: string
) => {
	const targetWeekday = date.weekday === 7 ? 0 : date.weekday;
	return shifts
		.filter((s) => s.dayOfWeek === targetWeekday)
		.map((s) => {
			const sStart = DateTime.fromJSDate(new Date(s.startTimeUtc), { zone: 'UTC' }).setZone(
				timeZone
			);
			const sEnd = DateTime.fromJSDate(new Date(s.endTimeUtc), { zone: 'UTC' }).setZone(timeZone);
			return Interval.fromDateTimes(
				date.set({ hour: sStart.hour, minute: sStart.minute }),
				date.set({ hour: sEnd.hour, minute: sEnd.minute })
			);
		})
		.filter((i) => i.isValid);
};

// 2. Data ophalen geïsoleerd
export const fetchBookingData = async (
	db: DatabaseType,
	branchId: string,
	serviceId: string,
	searchSpan: Interval
) => {
	const [organization, service] = await Promise.all([
		db.query.organization.findFirst({
			where: eq(schema.organization.id, branchId),
			with: { openingTimes: true }
		}),
		db.query.service.findFirst({
			where: eq(schema.service.id, serviceId)
		})
	]);

	if (!organization || !service) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Organisatie of dienst niet gevonden' });
	}

	const employees = await db.query.employeeService.findMany({
		where: eq(schema.employeeService.serviceId, serviceId),
		with: {
			member: {
				with: {
					availabilities: true,
					calendarItems: {
						// Using where closure for dates (assuming string format in SQLite)
						where: (items, { and, lt, gt }) =>
							and(
								lt(items.startTime, searchSpan.end!.toJSDate()),
								gt(items.endTime, searchSpan.start!.toJSDate())
							)
					}
				}
			}
		}
	});

	return { organization, service, employees };
};

// 3. Logica per medewerker geïsoleerd
export const calculateEmployeeSlots = (
	employees: any[],
	engine: ConfiguredEngine<any>,
	searchSpan: Interval,
	orgIntervals: Interval[],
	targetDate: DateTime,
	timeZone: string
) => {
	return employees.map(({ member }) => {
		const empIntervals = getIntervalsForDate(member.availabilities, targetDate, timeZone);
		const workingIntervals = IntervalUtils.intersect(orgIntervals, empIntervals);

		const unavailabilityBlocks: BlockedPeriod[] = IntervalUtils.subtract(
			[searchSpan],
			workingIntervals
		).map((i, idx) => ({
			id: `unavail-${member.id}-${idx}`,
			interval: i,
			metadata: { type: 'UNAVAILABLE' }
		}));

		const calendarItems = member.calendarItems.map((item: any) => ({
			...item,
			startTime: item.startTime,
			endTime: item.endTime
		}));

		const { intervals } = engine.getAvailableSlots({
			searchSpan,
			blockedPeriods: [...unavailabilityBlocks, ...mapToBlockedPeriods(calendarItems, 'type')]
		});

		return {
			employeeId: member.id,
			intervals,
			calendarItems: mapToBlockedPeriods(calendarItems, 'type').flatMap((b) => b.interval)
		};
	});
};
