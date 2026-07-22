import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { getOrganization } from '$lib/server/general';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { UpsertCalendarItemInput } from './upsert-calendar-item.schema';
import { enqueueTemplateEmail } from '../../../../../email-queue';

export const upsertCalendarItemHandler = async ({
	input,
	ctx: {
		session: { user },
		db,
		req,
		emailQueue
	}
}: {
	input: UpsertCalendarItemInput;
	ctx: PrivateContext;
}) => {
	const { title, startTime, endTime, notes, type, organizationId } = input;
	const id = 'id' in input ? input.id : undefined;
	const url = new URL(req.url);

	const organization = await getOrganization(db, organizationId);
	if (!organization) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'organization_not_found'
		});
	}

	if (!organization.members.some((member) => member.userId === user.id)) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'organization_member_not_found'
		});
	}

	const data: {
		title: string;
		startTime: Date;
		endTime: Date;
		notes: string;
		type: string;
		status?: string;
	} = {
		title: title ?? '',
		startTime,
		endTime,
		notes: notes ?? '',
		type
	};

	if (type === 'BOOKING' && 'status' in input && input.status) {
		data.status = input.status;
	}

	let calendarItem;
	let oldStatus: schema.BookingStatuses | null = null;

	if (id) {
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
				}
			}
		});

		if (existingItem?.booking) {
			oldStatus = existingItem.booking.status as schema.BookingStatuses;
		}

		const oldEmployeeId = existingItem?.booking?.employeeId;
		const newEmployeeId = type === 'BOOKING' && 'memberId' in input ? input.memberId : undefined;
		const memberChanged = oldEmployeeId !== newEmployeeId;

		await db
			.update(schema.calendarItem)
			.set({
				title: data.title,
				startTime: data.startTime,
				endTime: data.endTime,
				employeeId:
					type === 'BOOKING' && 'memberId' in input && input.memberId ? input.memberId : undefined,
				notes: data.notes,
				type: data.type as schema.CalendarItemTypes
			})
			.where(eq(schema.calendarItem.id, id));

		if (type === 'BOOKING' && existingItem?.booking) {
			await db
				.update(schema.booking)
				.set({
					status: data.status as schema.BookingStatuses,
					notes: data.notes,
					...(type === 'BOOKING' && 'serviceId' in input && input.serviceId
						? { serviceId: input.serviceId }
						: {}),
					...(type === 'BOOKING' && 'memberId' in input && input.memberId
						? { employeeId: input.memberId }
						: {}),
					...(type === 'BOOKING' && 'customerId' in input
						? { customerId: input.customerId || null }
						: {})
				})
				.where(eq(schema.booking.id, existingItem.booking.id));
		}

		if (type === 'BOOKING' && existingItem?.booking) {
			const booking = existingItem.booking;
			const newStatus = data.status as schema.BookingStatuses;
			const statusChanged = oldStatus && oldStatus !== newStatus;
			const timeChanged =
				existingItem.startTime.getTime() !== data.startTime.getTime() ||
				existingItem.endTime.getTime() !== data.endTime.getTime();

			let templateType: 'EMAIL_APPROVED' | 'EMAIL_DENIED' | 'EMAIL_CANCELED' | null = null;

			if (statusChanged) {
				if (newStatus === 'CONFIRMED') {
					templateType = 'EMAIL_APPROVED';
				} else if (newStatus === 'CANCELLED') {
					templateType = 'EMAIL_CANCELED';
				} else if (newStatus === 'PENDING' && oldStatus === 'CONFIRMED') {
					templateType = 'EMAIL_DENIED';
				}
			} else if (timeChanged && newStatus !== 'CANCELLED') {
				templateType = 'EMAIL_APPROVED';
			} else if (memberChanged && newStatus !== 'CANCELLED') {
				templateType = 'EMAIL_APPROVED';
			}

			if (templateType) {
				const dateStart = DateTime.fromJSDate(data.startTime, { zone: organization.timeZone });
				const dateEnd = DateTime.fromJSDate(data.endTime, { zone: organization.timeZone });
				const originalStartTime =
					timeChanged && newStatus !== 'CANCELLED'
						? DateTime.fromJSDate(existingItem.startTime, {
							zone: organization.timeZone
						})
						: null;
				const originalEndTime =
					timeChanged && newStatus !== 'CANCELLED'
						? DateTime.fromJSDate(existingItem.endTime, {
							zone: organization.timeZone
						})
						: null;

				let newMember = null;
				if (memberChanged && newEmployeeId) {
					newMember = await db.query.member.findFirst({
						where: (member, { eq }) => eq(member.id, newEmployeeId),
						with: {
							user: true
						}
					});
				}

				await enqueueTemplateEmail(emailQueue, {
					templateType,
					organizationId,
					bookingId: booking.id,
					targets: {
						customerEmail: booking.customer?.email,
						employeeEmail:
							memberChanged && newMember?.user?.email
								? newMember.user.email
								: booking.employee?.user?.email
					},
					origin: url.origin || ''
				});
			}
		}
	} else {
		if (type === 'BOOKING' && 'serviceId' in input && input.serviceId) {
			const bookingId = crypto.randomUUID();
			await db.insert(schema.booking).values({
				id: bookingId,
				status: (data.status as schema.BookingStatuses) || 'PENDING',
				notes: data.notes,
				serviceId: input.serviceId,
				employeeId: 'memberId' in input && input.memberId ? input.memberId : null,
				customerId: 'customerId' in input ? input.customerId || null : null,
				organizationId: input.organizationId,
				duration: 60
			});

			const [createdCalendarItem] = await db
				.insert(schema.calendarItem)
				.values({
					id: crypto.randomUUID(),
					title: data.title,
					startTime: data.startTime,
					endTime: data.endTime,
					notes: data.notes,
					type: data.type as schema.CalendarItemTypes,
					organizationId: input.organizationId,
					employeeId: 'memberId' in input && input.memberId ? input.memberId : undefined,
					updatedAt: new Date(),
					bookingId: bookingId
				})
				.returning();
		} else {
			calendarItem = (
				await db
					.insert(schema.calendarItem)
					.values({
						id: crypto.randomUUID(),
						title: data.title,
						startTime: data.startTime,
						endTime: data.endTime,
						notes: data.notes,
						type: data.type as schema.CalendarItemTypes,
						organizationId: input.organizationId,
						updatedAt: new Date()
					})
					.returning()
			)[0];
		}
	}

	return calendarItem;
};
