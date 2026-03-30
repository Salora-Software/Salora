import { TRPCError } from '@trpc/server';
import { db } from '@salora/database';
import { schema } from '@salora/database';
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
	const timeOff = await db.query.timeOff.findFirst({
		where: (to, { eq }) => eq(to.id, timeOffId),
		with: {
			member: {
				with: {
					organization: {
						with: {
							members: {
								where: (m, { eq }) => eq(m.userId, session.user.id)
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
	const isAdmin =
		sessionMember && (sessionMember.role === 'admin' || sessionMember.role === 'owner');

	if (!isSelf && !isAdmin) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'insufficient_permissions'
		});
	}

	// Delete both TimeOff and associated CalendarItem
	return await db.transaction(async (tx) => {
		// calendarItem is deleted automatically if defined with onDelete: Cascade in schema,
		// but let's be explicit if needed.
		await tx.delete(schema.calendarItem).where((ci, { eq }) => eq(ci.timeOffId, timeOffId));
		return await tx
			.delete(schema.timeOff)
			.where((to, { eq }) => eq(to.id, timeOffId))
			.returning()
			.then((r) => r[0]);
	});
};
