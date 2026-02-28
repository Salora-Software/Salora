import { TRPCError } from '@trpc/server';
import { prisma } from '$lib/server/prisma';
import type { AddTimeOffInput } from './add-time-off.schema';
import { CalendarItemType } from '@salora/database';

export const addTimeOffHandler = async ({
	input,
	ctx: { session }
}: {
	input: AddTimeOffInput;
	ctx: any;
}) => {
	const { organizationId, memberId, startTime, endTime, reason, type } = input;

	// Verify permissions: check if user is admin of the organization or is the member themselves
	const member = await prisma.member.findFirst({
		where: {
			id: memberId,
			organizationId: organizationId
		},
		include: {
			organization: {
				include: {
					members: {
						where: { userId: session.user.id as string }
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
	const isAdmin = sessionMember && (sessionMember.role === 'admin' || sessionMember.role === 'owner');

	if (!isSelf && !isAdmin) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'insufficient_permissions'
		});
	}

	const timeOffId = crypto.randomUUID();

	// Create TimeOff and CalendarItem in a transaction
	return await prisma.$transaction(async (tx) => {
		const timeOff = await tx.timeOff.create({
			data: {
				id: timeOffId,
				memberId: memberId,
				reason: reason,
				type: type
			}
		});

		await tx.calendarItem.create({
			data: {
				organizationId: organizationId,
				memberId: memberId,
				startTime: startTime,
				endTime: endTime,
				type: CalendarItemType.TIME_OFF,
				timeOffId: timeOffId,
				notes: reason
			}
		});

		return timeOff;
	});
};
