import { ORPCError } from '@orpc/server';
import { DateTime, Interval } from 'luxon';
import { schema, type DatabaseType } from '@salora/database';
import { eq } from 'drizzle-orm';
import { getIntervalsForDate } from '@salora/availability';
import {
	mapToBlockedPeriods,
	IntervalUtils,
	type BlockedPeriod,
	type ConfiguredEngine,
} from '@salora/scheduler';

export const fetchBookingData = async (
	db: DatabaseType,
	organizationId: string,
	serviceId: string,
	searchSpan: Interval,
) => {
	const [organization, service] = await Promise.all([
		db.query.organization.findFirst({
			where: eq(schema.organization.id, organizationId),
			with: { openingTimes: true },
		}),
		db.query.service.findFirst({
			where: eq(schema.service.id, serviceId),
		}),
	]);

	if (!organization || !service) {
		throw new ORPCError('NOT_FOUND', {
			message: 'Organization or service not found',
		});
	}

	const employees = await db.query.employeeService.findMany({
		where: eq(schema.employeeService.serviceId, serviceId),
		with: {
			member: {
				with: {
					availabilities: true,
					calendarItems: {
						where: (items, { and, lt, gt, notInArray }) => and(
							lt(items.startTime, searchSpan.end!.toJSDate()),
							gt(items.endTime, searchSpan.start!.toJSDate()),
							notInArray(
								items.bookingId,
								db.select({ id: schema.booking.id })
									.from(schema.booking)
									.where(eq(schema.booking.status, 'CANCELLED')),
							),
						),
					},
				},
			},
		},
	});

	return { organization, service, employees };
};

export const calculateEmployeeSlots = (
	employees: Array<{ member: any }>,
	engine: ConfiguredEngine<any>,
	searchSpan: Interval,
	orgIntervals: Interval[],
	targetDate: DateTime,
	timeZone: string,
) => {
	return employees.map(({ member }) => {
		const employeeIntervals = getIntervalsForDate(member.availabilities, targetDate, timeZone);
		const workingIntervals = IntervalUtils.intersect(orgIntervals, employeeIntervals);

		const unavailabilityBlocks: BlockedPeriod[] = IntervalUtils.subtract(
			[searchSpan],
			workingIntervals,
		).map((interval, idx) => ({
			id: `unavailable-${member.id}-${idx}`,
			interval,
			metadata: { type: 'UNAVAILABLE' },
		}));

		const calendarItems = member.calendarItems.map((item: any) => ({
			...item,
			startTime: item.startTime,
			endTime: item.endTime,
		}));

		const { intervals } = engine.getAvailableSlots({
			searchSpan,
			blockedPeriods: [...unavailabilityBlocks, ...mapToBlockedPeriods(calendarItems, 'type')],
		});

		return {
			employeeId: member.id,
			intervals,
			calendarItems: mapToBlockedPeriods(calendarItems, 'type').flatMap((period) => period.interval),
		};
	});
};