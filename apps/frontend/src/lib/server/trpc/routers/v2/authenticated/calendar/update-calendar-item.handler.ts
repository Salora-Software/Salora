import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getOrganization } from '$lib/server/general';
import { notificationService } from '$lib/server/NotificationService';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { UpdateCalendarItemInput } from './update-calendar-item.schema';

export const updateCalendarItemHandler = async ({
	input: { id, startTime, endTime },
	ctx: {
		session: { user },
		db
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
		const organization = await getOrganization(db, existingItem.organization.id);

		if (organization && booking.customer) {
			const dateStart = DateTime.fromJSDate(startTime, { zone: organization.timeZone });
			const dateEnd = DateTime.fromJSDate(endTime, { zone: organization.timeZone });
			const originalStartTime = DateTime.fromJSDate(existingItem.startTime, {
				zone: organization.timeZone
			});
			const originalEndTime = DateTime.fromJSDate(existingItem.endTime, {
				zone: organization.timeZone
			});

			await notificationService
				.sendEmailNotification({
					type: 'EMAIL_APPROVED',
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
							originalStart: {
								date: originalStartTime.toFormat('yyyy-MM-dd'),
								year: originalStartTime.year,
								month: originalStartTime.month,
								day: originalStartTime.day,
								hour: originalStartTime.hour.toString().padStart(2, '0'),
								minute: originalStartTime.minute.toString().padStart(2, '0')
							},
							originalEnd: {
								date: originalEndTime.toFormat('yyyy-MM-dd'),
								year: originalEndTime.year,
								month: originalEndTime.month,
								day: originalEndTime.day,
								hour: originalEndTime.hour.toString().padStart(2, '0'),
								minute: originalEndTime.minute.toString().padStart(2, '0')
							},
							isRescheduled: true
						}
					},
					branch: organization
				})
				.catch((error) => {
					console.error('Error sending reschedule notification email:', error);
				});
		}
	}

	return true;
};
