import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getOrganization } from '$lib/server/general';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { UpdateCalendarItemInput } from './update-calendar-item.schema';
import { enqueueTemplateEmail } from '../../../../../email-queue';

export const updateCalendarItemHandler = async ({
	input: { id, startTime, endTime },
	ctx: {
		session: { user },
		db,
		req,
		emailQueue
	}
}: {
	input: UpdateCalendarItemInput;
	ctx: PrivateContext;
}) => {
	const existingItem = await db.query.calendarItem.findFirst({
		where: (calendarItem, { eq }) => eq(calendarItem.id, id),
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
			organization: true
		}
	});

	if (!existingItem) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'calendar_item_not_found'
		});
	}

	if (existingItem.organization) {
		const organization = await getOrganization(db, existingItem.organization.id);
		if (!organization?.members.some((member) => member.userId === user.id)) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'organization_member_not_found'
			});
		}
	}

	const timeChanged =
		new Date(existingItem.startTime).getTime() !== startTime.getTime() ||
		new Date(existingItem.endTime).getTime() !== endTime.getTime();

	await db
		.update(schema.calendarItem)
		.set({ startTime, endTime })
		.where(eq(schema.calendarItem.id, id));

	if (
		timeChanged &&
		existingItem.booking &&
		existingItem.organization &&
		existingItem.booking.status !== 'CANCELLED'
	) {
		const booking = existingItem.booking;

		if (booking.customer) {
			await enqueueTemplateEmail(emailQueue, {
				templateType: 'EMAIL_APPROVED',
				organizationId: existingItem.organization.id,
				bookingId: booking.id,
				targets: {
					customerEmail: booking.customer?.email,
					employeeEmail: booking.employee?.user?.email
				},
				origin: req.headers.get('origin') || ''
			});
		}
	}

	return true;
};
