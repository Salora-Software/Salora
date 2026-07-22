import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { eq, and, desc } from 'drizzle-orm';
import type { GetTimeOffsInput } from './get-time-offs.schema';
import type { PrivateContext } from '@/middleware/trpc';

export const getTimeOffsHandler = async ({
	input,
	ctx: { session, db }
}: {
	input: GetTimeOffsInput;
	ctx: PrivateContext;
}) => {
	const { organizationId, memberId } = input;

	// Simple check: check if user is member of organization
	const userMember = await db.query.member.findFirst({
		where: and(
			eq(schema.member.organizationId, organizationId),
			eq(schema.member.userId, session.user.id)
		)
	});

	if (!userMember) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'not_a_member_of_this_organization'
		});
	}

	// Get time offs with calendar items, ordered by calendarItem.startTime desc
	const results = await db
		.select({
			timeOff: schema.timeOff,
			calendarItem: schema.calendarItem
		})
		.from(schema.timeOff)
		.leftJoin(schema.calendarItem, eq(schema.calendarItem.timeOffId, schema.timeOff.id))
		.where(
			and(
				eq(schema.timeOff.memberId, memberId),
				eq(schema.calendarItem.organizationId, organizationId)
			)
		)
		.orderBy(desc(schema.calendarItem.startTime));

	return results;
};
