import { TRPCError } from '@trpc/server';

import type { AddTimeOffInput } from './add-time-off.schema';
import { schema } from '@salora/database';
import type { PrivateContext } from '$lib/server/trpc/context';
import { inArray } from 'drizzle-orm';

export const addTimeOffHandler = async ({
	input,
	ctx: { session, db }
}: {
	input: AddTimeOffInput;
	ctx: PrivateContext;
}) => {
	const { organizationId, memberId, startTime, endTime, reason, type } = input;

	// Verify permissions: check if user is admin of the organization or is the member themselves
	const member = await db.query.member.findFirst({
		where: (member, { and, eq }) =>
			and(eq(member.id, memberId), eq(member.organizationId, organizationId)),
		with: {
			organization: {
				with: {
					members: {
						where: (m, { eq }) => eq(m.userId, session.user.id)
					}
				}
			}
		}
	});

	if (!member) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'member_not_found'
		});
	}

	const sessionMember = member.organization.members[0];
	const isSelf = member.userId === session.user.id;
	const isAdmin =
		sessionMember && (sessionMember.role === 'admin' || sessionMember.role === 'owner');

	if (!isSelf && !isAdmin) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'insufficient_permissions'
		});
	}

	if (startTime >= endTime) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'start_time_must_be_before_end_time'
		});
	}

	// 1. Check for overlapping bookings or existing time-off
	const conflictingItems = await db.query.calendarItem.findMany({
		where: (ci, { and, eq, lt, gt, inArray }) =>
			and(
				eq(ci.employeeId, memberId),
				inArray(ci.type, [schema.CalendarItemTypes.BOOKING, schema.CalendarItemTypes.TIME_OFF]),
				lt(ci.startTime, endTime),
				gt(ci.endTime, startTime)
			),
		with: {
			booking: true
		}
	});

	const activeConflicts = conflictingItems.filter(
		(item) =>
			item.type !== schema.CalendarItemTypes.BOOKING ||
			(item.booking && item.booking.status !== 'CANCELLED')
	);

	if (activeConflicts.length > 0) {
		const hasBookingConflict = activeConflicts.some(
			(i) => i.type === schema.CalendarItemTypes.BOOKING
		);
		throw new TRPCError({
			code: 'CONFLICT',
			message: hasBookingConflict ? 'overlap_with_existing_booking' : 'overlap_with_existing_time_off'
		});
	}

	const timeOffId = crypto.randomUUID();

	// Create TimeOff and CalendarItem in a transaction
	const results = await db.batch([
		db.insert(schema.timeOff)
			.values({
				id: timeOffId,
				memberId: memberId,
				reason: reason,
				type: type
			})
			.returning(),
		db.insert(schema.calendarItem).values({
			id: crypto.randomUUID(),
			organizationId: organizationId,
			employeeId: memberId,
			startTime: startTime,
			endTime: endTime,
			type: schema.CalendarItemTypes.TIME_OFF,
			timeOffId: timeOffId,
			notes: reason,
			updatedAt: new Date()
		})
	]);

	// db.batch retourneert een array met resultaten voor elke query.
	// results[0] is de output van de timeOff insert. Daarvan pakken we het eerste geretourneerde object.
	return results[0][0];
};
