import { z } from 'zod';
import { router as createRouter, portalProcedure } from '../../context';
import { prisma } from '$lib/server/prisma';
import { TRPCError } from '@trpc/server';
import { getOrganization } from '$lib/server/general';
import { notificationService } from '$lib/server/NotificationService';
import { DateTime, Interval } from 'luxon';
import { auth } from '$lib/server/auth';
import { PUBLIC_FRONTEND_URL } from '$env/static/public';

import { getAvailabilitySchema } from './availability.schema';
import { getOccupancySchema } from './occupancy.schema';
import { createBookingSchema } from './booking.schema';

export const router = createRouter({
	getAvailability: portalProcedure.input(getAvailabilitySchema).query(async (opts) => {
		const { getAvailabilityHandler } = await import('./availability.handler');
		return await getAvailabilityHandler(opts);
	}),
	getOccupancy: portalProcedure.input(getOccupancySchema).query(async (opts) => {
		const { getOccupancyHandler } = await import('./occupancy.handler');
		return await getOccupancyHandler(opts);
	}),
	createBooking: portalProcedure.input(createBookingSchema).mutation(async (opts) => {
		const { createBookingHandler } = await import('./booking.handler');
		return await createBookingHandler(opts);
	}),

	sendMagicLink: portalProcedure

		.input(
			z.object({
				email: z.string().email(),
				branchId: z.string()
			})
		)
		.mutation(async ({ input: { email, branchId }, ctx: { headers } }) => {
			const customer = await prisma.customer.findFirst({
				where: {
					user: {
						email: email,
						customers: {
							some: {
								organizationId: branchId
							}
						}
					}
				}
			});
			if (!customer) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'customer_not_found' });
			}
			const organization = await getOrganization(branchId);
			if (!organization) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'branch_not_found' });
			}

			const magicLinkRequest = await auth.api.signInMagicLink({
				headers,
				body: {
					email,
					callbackURL: `${PUBLIC_FRONTEND_URL}/app/appointments/${branchId}?email=${email}`
				}
			});

			// If the magic link verification was successful, send the email
			if (!magicLinkRequest.status) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'failed_to_send_magic_link'
				});
			}
			const magicLinkVerification = await prisma.verification.findFirst({
				where: {
					value: {
						equals: `{"email":"${email}"}`
					},
					expiresAt: {
						gte: new Date()
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			});

			if (!magicLinkVerification) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'magic_link_verification_not_found'
				});
			}

			const calendarItem = await prisma.calendarItem.findFirst({
				where: {
					organizationId: branchId,
					type: 'BOOKING',
					booking: {
						customerId: customer.id
					}
				},
				orderBy: {
					startTime: 'asc'
				}
			});
			if (!calendarItem) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'no_booking_found_for_the_customer' });
			}

			// Only send if the email matches the customer's email
			if (email !== customer.email) {
				// Ignore unrecognized email, do not leak info
				return { success: true };
			}
			// Send magic link email using custom template
			const encode = encodeURIComponent;
			const url = `${PUBLIC_FRONTEND_URL}/api/auth/magic-link/verify?token=${magicLinkVerification?.identifier ?? ''}&callbackURL=${encode(`/app/appointments/${organization.id}?email=${email}`)}`;
			await notificationService.sendEmailNotification({
				to: email,
				branch: organization,
				variables: {
					magicLink: url,
					customer: {
						name: customer.name || '',
						email: customer.email || ''
					}
				},
				customTemplate: {
					subject: 'Je verificatie link',
					body: `
						<html>
							<body style="font-family: Arial, sans-serif; color: #222;">
								<div style="max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px; background: #fafbfc;">
									<h2 style="color: #2d7ff9;">Hallo {{customer.name}},</h2>
									<p>
										Klik op de onderstaande knop om je e-mailadres te verifiëren en in te loggen op je account:
									</p>
									<p style="text-align: center; margin: 32px 0;">
										<a href="{{magicLink}}" style="background: #2d7ff9; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
											Verifieer &amp; Log in
										</a>
									</p>
									<p style="font-size: 14px; color: #888;">
										Heb je deze aanvraag niet gedaan? Negeer deze e-mail dan gerust.
									</p>
								</div>
							</body>
						</html>
					`
				}
			});
			return { success: true };
		}),
	cancelAppointment: portalProcedure
		.input(z.object({ appointmentId: z.string() }))
		.mutation(async ({ input: { appointmentId, branchId }, ctx }) => {
			if (!ctx.customer?.id) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'you_need_to_be_authenticated_to_cancel_an_appointment'
				});
			}
			const customer = ctx.customer;
			//get branch
			const organization = await getOrganization(branchId);
			if (!organization) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'branch_not_found' });
			}

			// Find the calendar item and booking
			const calendarItem = await prisma.calendarItem.findUnique({
				where: { id: appointmentId },
				include: {
					booking: {
						include: {
							customer: true,
							service: true,
							employee: {
								include: {
									user: true
								}
							}
						}
					}
				}
			});
			if (!calendarItem || !calendarItem.booking) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'appointment_not_found' });
			}
			const booking = calendarItem.booking;
			// Only allow cancel if the booking belongs to the customer
			if (calendarItem.booking.customerId !== customer.id) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'not_allowed_to_cancel_this_appointment'
				});
			}
			// Update booking status to CANCELLED
			await prisma.booking.update({
				where: { id: calendarItem.booking.id },
				data: { status: 'CANCELLED' }
			});
			// Optionally, update calendar item notes or other fields
			const dateStart = DateTime.fromJSDate(calendarItem.startTime, {
				zone: organization.timeZone || 'UTC'
			});
			const dateEnd = DateTime.fromJSDate(calendarItem.endTime);
			await notificationService.sendEmailNotification({
				type: 'EMAIL_CANCELED',
				to: booking.customer?.email || '',
				employeeEmail: booking.employee?.user.email,
				variables: {
					customer: {
						name: booking.customer?.name || '',
						email: booking.customer?.email || '',
						phone: booking.customer?.phone || ''
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
			});
			return { success: true };
		})
});
