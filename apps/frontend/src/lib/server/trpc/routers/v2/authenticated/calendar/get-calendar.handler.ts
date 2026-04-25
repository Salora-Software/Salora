import { DateTime, Interval } from 'luxon';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getEmployeeAvailabilityV2, getOrganization } from '$lib/server/general';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { GetCalendarInput } from './get-calendar.schema';

function getClosedIntervals(range: Interval, openIntervals: Interval[]): Interval[] {
	const filtered: Interval[] = openIntervals.filter(
		(interval): interval is Interval => !!interval && !!interval.start && !!interval.end
	);
	const sorted = filtered.sort(
		(a, b) => (a.start as DateTime).toMillis() - (b.start as DateTime).toMillis()
	);
	const closed: Interval[] = [];
	let cursor = range.start;
	if (!cursor || !range.end) return [];
	for (const open of sorted) {
		if (!open.start || !open.end) continue;
		if (open.start > cursor) {
			closed.push(Interval.fromDateTimes(cursor, open.start));
		}
		if (open.end > cursor) {
			cursor = open.end;
		}
	}
	if (cursor < range.end) {
		closed.push(Interval.fromDateTimes(cursor, range.end));
	}
	return closed;
}

export const getCalendarHandler = async ({
	input: { organizationId, startDate, endDate },
	ctx: { db }
}: {
	input: GetCalendarInput;
	ctx: PrivateContext;
}) => {
	const calendarItems = await db.query.calendarItem.findMany({
		where: (calendarItem, { eq, lt, gt, and }) =>
			and(
				eq(calendarItem.organizationId, organizationId),
				lt(calendarItem.startTime, endDate),
				gt(calendarItem.endTime, startDate)
			),
		orderBy: (calendarItem, { asc }) => [asc(calendarItem.startTime)],
		with: {
			booking: {
				with: {
					customer: true,
					service: true,
					employee: {
						with: {
							user: true
						}
					}
				}
			},
			employee: {
				with: {
					user: true
				}
			}
		}
	});

	const range = Interval.fromDateTimes(startDate, endDate);
	const org = await getOrganization(db, organizationId);

	if (!org) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'organization_not_found'
		});
	}

	return {
		items: calendarItems,
		disabledItems: org.members.map((member) => {
			const availability = getEmployeeAvailabilityV2(
				org,
				member.id,
				Interval.fromDateTimes(startDate, endDate),
				false
			);
			const filteredOpenings = availability.filter(
				(interval): interval is Interval => !!interval && !!interval.start && !!interval.end
			);
			const closedIntervals = getClosedIntervals(range, filteredOpenings);
			return {
				person: member.user.name,
				date: closedIntervals
			};
		})
	};
};
