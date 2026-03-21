import { TRPCError } from '@trpc/server';
import { prisma } from '$prisma';
import type { GetTimeOffsInput } from './get-time-offs.schema';

export const getTimeOffsHandler = async ({
	input,
	ctx: { session }
}: {
	input: GetTimeOffsInput;
	ctx: any;
}) => {
	const { organizationId, memberId } = input;

	// Simple check: check if user is member of organization
	const userMember = await prisma.member.findFirst({
		where: {
			organizationId: organizationId,
			userId: session.user.id
		}
	});

	if (!userMember) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'not_a_member_of_this_organization'
		});
	}

	return await prisma.timeOff.findMany({
		where: {
			memberId: memberId,
			member: {
				organizationId: organizationId
			}
		},
		include: {
			calendarItem: true
		},
		orderBy: {
			calendarItem: {
				startTime: 'desc'
			}
		}
	});
};
