import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { schema } from '@salora/database';
import { TRPCError } from '@trpc/server';
import { getEmployeeAvailabilityV2, getOrganization } from '$lib/server/general';
import { notificationService } from '$lib/server/NotificationService';

import { DateTime, Interval } from 'luxon';
import { eq } from 'drizzle-orm';

// Utility: Given a range and an array of open intervals, return the complement (closed intervals) within the range
function getClosedIntervals(range: Interval, openIntervals: Interval[]): Interval[] {
	// Filter out nulls and intervals with null start/end, then sort by start
	const filtered: Interval[] = openIntervals.filter(
		(i): i is Interval => !!i && !!i.start && !!i.end
	);
	const sorted = filtered.sort(
		(a, b) => (a.start as DateTime).toMillis() - (b.start as DateTime).toMillis()
	);
	const closed: Interval[] = [];
	let cursor = range.start;
	if (!cursor || !range.end) return [];
	for (const open of sorted) {
		if (!open.start || !open.end) continue;
		if (open.start > cursor) {
			closed.push(Interval.fromDateTimes(cursor, open.start));
		}
		if (open.end > cursor) {
			cursor = open.end;
		}
	}
	if (cursor < range.end) {
		closed.push(Interval.fromDateTimes(cursor, range.end));
	}
	return closed;
}

export const router = createRouter({
	updateCalendarItem: privateProcedure
		.input(
			z.object({
				id: z.string(),
				startTime: z.date(),
				endTime: z.date()
			})
		)
		.output(z.boolean())
		.mutation(
			async ({
				input: { id, startTime, endTime },
				ctx: {
					session: { user }
				}
			}) => {
				// Get existing calendar item with booking details for comparison
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

				// Check if user is a member of the organization
				if (existingItem.organization) {
					const organization = await getOrganization(existingItem.organization.id);
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

				// Send email notification if time changed and it's a booking (but not for canceled bookings)
				if (
					timeChanged &&
					existingItem.booking &&
					existingItem.organization &&
					existingItem.booking.status !== 'CANCELLED'
				) {
					const booking = existingItem.booking;
					const organization = await getOrganization(existingItem.organization.id);

					if (organization && booking.customer) {
						const dateStart = DateTime.fromJSDate(startTime, {
							zone: organization.timeZone
						});
						const dateEnd = DateTime.fromJSDate(endTime, {
							zone: organization.timeZone
						});
						const originalStartTime = DateTime.fromJSDate(existingItem.startTime, {
							zone: organization.timeZone
						});
						const originalEndTime = DateTime.fromJSDate(existingItem.endTime, {
							zone: organization.timeZone
						});

						await notificationService
							.sendEmailNotification({
								type: 'EMAIL_APPROVED', // Use EMAIL_APPROVED for rescheduling notifications
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
							.catch((e) => {
								console.error('Error sending reschedule notification email:', e);
							});
					}
				}

				return true;
			}
		),

	getCalendar: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				startDate: z.date(),
				endDate: z.date()
			})
		)
		.query(async ({ input: { organizationId, startDate, endDate } }) => {
			let calendarItems = await db.query.calendarItem.findMany({
				where: (calendarItem, { eq, and, lt, gt }) =>
					and(
						eq(calendarItem.organizationId, organizationId),
						lt(calendarItem.startTime, endDate),
						gt(calendarItem.endTime, startDate)
					),
				orderBy: (calendarItem, { asc }) => [asc(calendarItem.startTime)],
				with: {
					booking: {
						with: {
							service: true,
							employee: {
								with: {
									user: true
								}
							}
						}
					},
					member: {
						with: {
							user: true
						}
					}
				}
			});
			const range = Interval.fromDateTimes(startDate, endDate);

			//Alo per member calculate the disabledItems
			// Get the operation hours for the organization
			const org = await getOrganization(organizationId);
			return {
				items: calendarItems,
				disabledItems: org.members.map((member) => {
					const availability = getEmployeeAvailabilityV2(
						org,
						member.id,
						Interval.fromDateTimes(startDate, endDate),
						false
					);
					const filteredOpenings = availability.filter(
						(i): i is Interval => !!i && !!i.start && !!i.end
					);
					const closedIntervals = getClosedIntervals(range, filteredOpenings);
					return {
						person: member.user.name,
						date: closedIntervals
					};
				})
			};
		}),

	upsertCalendarItem: privateProcedure
		.input(
			z.union([
				z.object({
					type: z.literal('BOOKING'),
					organizationId: z.string(),
					title: z.string(),
					startTime: z.date(),
					endTime: z.date(),
					notes: z.string(),
					id: z.string().optional(),
					status: z.string(),
					serviceId: z.string().optional(),
					memberId: z.string().optional()
				}),
				z.object({
					id: z.string().optional(),
					type: z.string().refine((val) => val !== 'BOOKING', {
						message: 'for_non_booking_calendar_items_use_a_type_other_than_booking'
					}),
					organizationId: z.string(),
					title: z.string(),
					startTime: z.date(),
					endTime: z.date(),
					notes: z.string()
				})
			])
		)
		.mutation(
			async ({
				input,
				ctx: {
					session: { user }
				}
			}) => {
				const { title, startTime, endTime, notes, type, organizationId } = input;
				const id = 'id' in input ? input.id : undefined;
				// Check if the user is a member of the organization
				const organization = await getOrganization(organizationId);
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				// Check if the user is a member of the organization
				if (!organization.members.some((member) => member.userId === user.id))
					throw new TRPCError({
						code: 'FORBIDDEN',
						message: 'organization_member_not_found'
					});

				const data: {
					title: string;
					startTime: Date;
					endTime: Date;
					notes: string;
					type: string;
					status?: string;
				} = {
					title,
					startTime,
					endTime,
					notes,
					type
				};

				if (type === 'BOOKING' && 'status' in input && input.status) {
					data.status = input.status;
				}

				let calendarItem;
				let oldStatus: schema.BookingStatuses | null = null;

				if (id) {
					// Get existing calendar item with booking details for status comparison
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

					// Check if member (employee) has changed
					const oldEmployeeId = existingItem?.booking?.employeeId;
					const newEmployeeId =
						type === 'BOOKING' && 'memberId' in input ? input.memberId : undefined;
					const memberChanged = oldEmployeeId !== newEmployeeId;

					await db
						.update(schema.calendarItem)
						.set({
							title: data.title,
							startTime: data.startTime,
							endTime: data.endTime,
							employeeId:
								type === 'BOOKING' && 'memberId' in input && input.memberId
									? input.memberId
									: undefined,
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
									: {})
							})
							.where(eq(schema.booking.id, existingItem.booking.id));
					}

					// Send email notification if status changed, time changed, or member changed
					if (type === 'BOOKING' && existingItem?.booking) {
						const booking = existingItem.booking;
						const newStatus = data.status as schema.BookingStatuses;
						const statusChanged = oldStatus && oldStatus !== newStatus;
						const timeChanged =
							existingItem.startTime.getTime() !== data.startTime.getTime() ||
							existingItem.endTime.getTime() !== data.endTime.getTime();

						let templateType: 'EMAIL_APPROVED' | 'EMAIL_DENIED' | 'EMAIL_CANCELED' | null = null;

						// Determine template type based on status change
						if (statusChanged) {
							if (newStatus === 'CONFIRMED') {
								templateType = 'EMAIL_APPROVED';
							} else if (newStatus === 'CANCELLED') {
								templateType = 'EMAIL_CANCELED';
							} else if (newStatus === 'PENDING' && oldStatus === 'CONFIRMED') {
								templateType = 'EMAIL_DENIED';
							}
						} else if (timeChanged && newStatus !== 'CANCELLED') {
							// For time changes, use EMAIL_APPROVED to notify about the rescheduling
							// But ignore time changes for canceled appointments
							templateType = 'EMAIL_APPROVED';
						} else if (memberChanged && newStatus !== 'CANCELLED') {
							// For member changes, use EMAIL_APPROVED to notify about the staff reassignment
							// But ignore member changes for canceled appointments
							templateType = 'EMAIL_APPROVED';
						}

						if (templateType && booking.customer) {
							const dateStart = DateTime.fromJSDate(data.startTime, {
								zone: organization.timeZone
							});
							const dateEnd = DateTime.fromJSDate(data.endTime, {
								zone: organization.timeZone
							});

							// Include original time information if time changed (but not for cancellations)
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

							// Get new member information if member changed
							let newMember = null;
							if (memberChanged && newEmployeeId) {
								newMember = await db.query.member.findFirst({
									where: (member, { eq }) => eq(member.id, newEmployeeId),
									with: {
										user: true
									}
								});
							}

							await notificationService
								.sendEmailNotification({
									type: templateType,
									to: booking.customer.email,
									employeeEmail:
										memberChanged && newMember
											? newMember.user.email
											: booking.employee?.user.email,
									variables: {
										customer: {
											name: booking.customer.name,
											email: booking.customer.email,
											phone: booking.customer.phone
										},
										booking: {
											name: booking.service.name,
											employee:
												memberChanged && newMember
													? newMember.user.name
													: booking.employee?.user.name,
											employeeId:
												memberChanged && newEmployeeId ? newEmployeeId : booking.employeeId,
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
											// Include original time information for rescheduling notifications
											...(timeChanged && originalStartTime && originalEndTime
												? {
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
												: {}),
											// Include member change information for staff reassignment notifications
											...(memberChanged
												? {
														originalEmployee: booking.employee?.user.name,
														newEmployee: newMember?.user.name,
														isStaffReassigned: true
													}
												: {})
										}
									},
									branch: organization
								})
								.catch((e) => {
									console.error('Error sending notification email:', e);
								});
						}
					}
				} else {
					// Create calendar item
					if (type === 'BOOKING' && 'serviceId' in input && input.serviceId) {
						// Create with booking relationship - serviceId is required for bookings
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
								bookingId: crypto.randomUUID()
							})
							.returning();

						if (createdCalendarItem) {
							await db.insert(schema.booking).values({
								id: createdCalendarItem.bookingId!,
								status: (data.status as schema.BookingStatuses) || 'PENDING',
								notes: data.notes,
								serviceId: input.serviceId,
								employeeId: 'memberId' in input && input.memberId ? input.memberId : undefined,
								customerId: null, // This would need to be provided for actual bookings
								organizationId: input.organizationId,
								duration: 60 // Default duration, should be calculated from service
							});
						}
					} else {
						// Create non-booking calendar item or booking without service
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
			}
		),

	deleteCalendarItem: privateProcedure
		.input(z.object({ id: z.string() }))
		.output(z.boolean())
		.mutation(
			async ({
				input: { id },
				ctx: {
					session: { user }
				}
			}) => {
				// TODO: Add validation to ensure user is a member of the organization before deleting
				// Get existing calendar item with booking details
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

				// Check if user is a member of the organization
				if (existingItem.organization) {
					const organization = await getOrganization(existingItem.organization.id);
					if (!organization?.members.some((member) => member.userId === user.id)) {
						throw new TRPCError({
							code: 'FORBIDDEN',
							message: 'organization_member_not_found'
						});
					}
				}

				// If this is a booking, update the booking status to CANCELLED and notify customer
				if (existingItem.booking && existingItem.organization) {
					const booking = existingItem.booking;
					const organization = await getOrganization(existingItem.organization.id);

					// Update booking status to CANCELLED
					await db
						.update(schema.booking)
						.set({ status: schema.BookingStatuses.CANCELLED })
						.where(eq(schema.booking.id, booking.id));

					// Send cancellation email notification to customer
					if (organization && booking.customer && booking.status !== 'CANCELLED') {
						const dateStart = DateTime.fromJSDate(existingItem.startTime, {
							zone: organization.timeZone
						});
						const dateEnd = DateTime.fromJSDate(existingItem.endTime, {
							zone: organization.timeZone
						});

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
							.catch((e) => {
								console.error('Error sending cancellation notification email:', e);
							});
					}
				}

				// Delete the calendar item
				await db.delete(schema.calendarItem).where(eq(schema.calendarItem.id, id));

				return true;
			}
		)
});
