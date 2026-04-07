import { TRPCError } from '@trpc/server';

import { schema } from '@salora/database';
import type { RemoveTimeOffInput } from './remove-time-off.schema';
import type { PrivateContext } from '$lib/server/trpc/context';
import { eq } from 'drizzle-orm';

export const removeTimeOffHandler = async ({
	input,
	ctx: { session, db }
}: {
	input: RemoveTimeOffInput;
	ctx: PrivateContext;
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
	const results = await db.batch([
		db.delete(schema.calendarItem).where(eq(schema.calendarItem.timeOffId, timeOffId)),
		db.delete(schema.timeOff).where(eq(schema.timeOff.id, timeOffId)).returning()
	]);

	// results[1] bevat het resultaat van de tweede query (de timeOff delete).
	// Daarvan pakken we weer het eerste geretourneerde object.
	return results[1][0];
};
