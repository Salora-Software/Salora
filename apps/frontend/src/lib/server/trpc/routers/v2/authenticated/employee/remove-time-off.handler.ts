import { TRPCError } from '@trpc/server';
import { prisma } from '$lib/server/prisma';
import type { RemoveTimeOffInput } from './remove-time-off.schema';

export const removeTimeOffHandler = async ({
	input,
	ctx: { session }
}: {
	input: RemoveTimeOffInput;
	ctx: any;
}) => {
	const { organizationId, timeOffId } = input;

	// Check if timeOff exists and user has permission (admin/owner or own timeOff)
	const timeOff = await prisma.timeOff.findUnique({
		where: { id: timeOffId },
		include: {
			member: {
				include: {
					organization: {
						include: {
							members: {
								where: { userId: session.user.id }
							}
						}
					}
				}
			}
		}
	});

	if (!timeOff || timeOff.member.organizationId !== organizationId) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'time_off_not_found'
		});
	}

	const sessionMember = timeOff.member.organization.members[0];
	const isSelf = timeOff.member.userId === session.user.id;
	const isAdmin = sessionMember && (sessionMember.role === 'admin' || sessionMember.role === 'owner');

	if (!isSelf && !isAdmin) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'insufficient_permissions'
		});
	}

	// Delete both TimeOff and associated CalendarItem
	return await prisma.$transaction(async (tx) => {
		// calendarItem is deleted automatically if defined with onDelete: Cascade in schema, 
		// but let's be explicit if needed. 
		// Looking at schema: calendarItem has timeOffId and calendarItem is optional on TimeOff.

		await tx.calendarItem.deleteMany({
			where: { timeOffId: timeOffId }
		});

		return await tx.timeOff.delete({
			where: { id: timeOffId }
		});
	});
};
