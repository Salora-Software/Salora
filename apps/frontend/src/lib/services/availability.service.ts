import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import { schema, type DatabaseType } from '@salora/database';
import { eq, and, gt, lt, or, isNull } from 'drizzle-orm';
import { getIntervalsForDate } from '@salora/availability';
import {
	mapToBlockedPeriods,
	IntervalUtils,
	type BlockedPeriod,
	ConfiguredEngine
} from '@salora/scheduler';

// 2. Data ophalen geïsoleerd
export const fetchBookingData = async (
	db: DatabaseType,
	organizationId: string,
	serviceId: string,
	searchSpan: Interval
) => {
	const [organization, service] = await Promise.all([
		db.query.organization.findFirst({
			where: eq(schema.organization.id, organizationId),
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
						where: (items, { and, lt, gt, notInArray, or, isNull }) =>
							and(
								lt(items.startTime, searchSpan.end!.toJSDate()),
								gt(items.endTime, searchSpan.start!.toJSDate()),
								or(
									isNull(items.bookingId),
									notInArray(
										items.bookingId,
										db.select({ id: schema.booking.id })
											.from(schema.booking)
											.where(eq(schema.booking.status, 'CANCELLED'))
									)
								)
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
