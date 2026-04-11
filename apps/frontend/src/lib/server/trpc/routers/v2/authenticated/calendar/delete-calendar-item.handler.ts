import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getOrganization } from '$lib/server/general';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { DeleteCalendarItemInput } from './delete-calendar-item.schema';
import { enqueueTemplateEmail } from '../../../../../email-queue';

export const deleteCalendarItemHandler = async ({
	input: { id },
	ctx: {
		session: { user },
		db,
		req,
		emailQueue
	}
}: {
	input: DeleteCalendarItemInput;
	ctx: PrivateContext;
}) => {
	const url = new URL(req.url);
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

	if (existingItem.booking && existingItem.organization) {
		const booking = existingItem.booking;
		const organization = await getOrganization(db, existingItem.organization.id);

		await db
			.update(schema.booking)
			.set({ status: schema.BookingStatuses.CANCELLED })
			.where(eq(schema.booking.id, booking.id));

		if (organization && booking.customer && booking.status !== 'CANCELLED') {
			await enqueueTemplateEmail(emailQueue, {
				templateType: 'EMAIL_CANCELED',
				organizationId: existingItem.organization.id,
				bookingId: booking.id,
				targets: {
					customerEmail: booking.customer?.email,
					employeeEmail: booking.employee?.user?.email
				},
				origin: req.headers.get("host") || ''
			});
		}
	}

	await db.delete(schema.calendarItem).where(eq(schema.calendarItem.id, id));

	return true;
};
