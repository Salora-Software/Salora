import { TRPCError } from '@trpc/server';
import { db } from '$lib/server/db';
import type { AddTimeOffInput } from './add-time-off.schema';
import { schema } from '@salora/database';

export const addTimeOffHandler = async ({
	input,
	ctx: { session }
}: {
	input: AddTimeOffInput;
	ctx: any;
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
						where: (m, { eq }) => eq(m.userId, session.user.id as string)
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

	const timeOffId = crypto.randomUUID();

	// Create TimeOff and CalendarItem in a transaction
	return await db.transaction(async (tx) => {
		const timeOff = await tx
			.insert(schema.timeOff)
			.values({
				id: timeOffId,
				memberId: memberId,
				reason: reason,
				type: type
			})
			.returning()
			.then((r) => r[0]);

		await tx.insert(schema.calendarItem).values({
			id: crypto.randomUUID(),
			organizationId: organizationId,
			employeeId: memberId,
			startTime: startTime,
			endTime: endTime,
			type: schema.CalendarItemTypes.TIME_OFF,
			timeOffId: timeOffId,
			notes: reason,
			updatedAt: new Date()
		});

		return timeOff;
	});
};
