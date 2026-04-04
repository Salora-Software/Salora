import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getOrganization } from '$lib/server/general';
import { notificationService } from '$lib/server/NotificationService';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { DeleteCalendarItemInput } from './delete-calendar-item.schema';

export const deleteCalendarItemHandler = async ({
	input: { id },
	ctx: {
		session: { user },
		db
	}
}: {
	input: DeleteCalendarItemInput;
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

	if (existingItem.booking && existingItem.organization) {
		const booking = existingItem.booking;
		const organization = await getOrganization(db, existingItem.organization.id);

		await db
			.update(schema.booking)
			.set({ status: schema.BookingStatuses.CANCELLED })
			.where(eq(schema.booking.id, booking.id));

		if (organization && booking.customer && booking.status !== 'CANCELLED') {
			const dateStart = DateTime.fromJSDate(existingItem.startTime, { zone: organization.timeZone });
			const dateEnd = DateTime.fromJSDate(existingItem.endTime, { zone: organization.timeZone });

			await notificationService
				.sendEmailNotification({
					type: 'EMAIL_CANCELED',
					to: booking.customer.email,
					employeeEmail: booking.employee?.user.email,
					variables: {
						customer: {
							name: booking.customer.name,
							email: booking.customer.email,
							phone: booking.customer.phone
						},
						booking: {
							name: booking.service.name,
							employee: booking.employee?.user.name,
							employeeId: booking.employeeId,
							serviceId: booking.serviceId,
							serviceDuration: booking.service.duration,
							servicePrice: booking.service.price,
							serviceDescription: booking.service.description,
							start: {
								date: dateStart.toFormat('yyyy-MM-dd'),
								year: dateStart.year,
								month: dateStart.month,
								day: dateStart.day,
								hour: dateStart.hour.toString().padStart(2, '0'),
								minute: dateStart.minute.toString().padStart(2, '0')
							},
							end: {
								date: dateEnd.toFormat('yyyy-MM-dd'),
								year: dateEnd.year,
								month: dateEnd.month,
								day: dateEnd.day,
								hour: dateEnd.hour.toString().padStart(2, '0'),
								minute: dateEnd.minute.toString().padStart(2, '0')
							},
							isCancelled: true
						}
					},
					branch: organization
				})
				.catch((error) => {
					console.error('Error sending cancellation notification email:', error);
				});
		}
	}

	await db.delete(schema.calendarItem).where(eq(schema.calendarItem.id, id));

	return true;
};
