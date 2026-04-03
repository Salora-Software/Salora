import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import { getDaySpanForJsDate, getIntervalsForDate } from '@salora/availability';
import { calculateEmployeeSlots } from '$lib/services/availability.service';
import {
	createAppointmentContext,
	getBookingCutoffDateTime
} from '$lib/services/appointment-context.service';
import type { CreateBookingInput } from './booking.schema';
import type { PortalContext } from '../../context';
import type { EmailQueueMessage } from '@salora/mailer';

// Let op: pas de onderstaande imports aan naar jouw daadwerkelijke paden
import { env } from '$lib/server/env';

type CreateBookingOpts = {
	ctx: PortalContext;
	input: CreateBookingInput;
};

export const createBookingHandler = async ({
	input,
	ctx: { db, headers, auth, url, emailQueue }
}: CreateBookingOpts) => {
	const { organizationId, serviceId, employeeId, date, contact } = input;
	// 1. Haal de globale organisatie- en service data op voor deze dag
	const initialSpan = getDaySpanForJsDate(date);

	const { organization, service, employees, timeZone, engine } = await createAppointmentContext(
		db,
		organizationId,
		serviceId,
		initialSpan.utcSpan
	);

	// 2. Definieer het specifieke gezochte interval
	const requestedStart = DateTime.fromJSDate(date, { zone: timeZone });
	const requestedEnd = requestedStart.plus({ minutes: service.duration });
	const requestedInterval = Interval.fromDateTimes(requestedStart, requestedEnd);
	const bookingCutoff = getBookingCutoffDateTime(timeZone, organization.minimumBookingTime);

	if (!requestedInterval.isValid) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'ongeldige_datum' });
	}

	if (requestedStart < bookingCutoff) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'slot_too_soon' });
	}

	// Filter specifieke medewerker als deze is meegegeven
	const employeesToUse = employeeId
		? employees.filter((e) => e.member.id === employeeId)
		: employees;

	if (employeesToUse.length === 0) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'no_employees_for_service' });
	}

	// 3. Bereken beschikbaarheid via de Engine
	const orgIntervals = getIntervalsForDate(organization.openingTimes, requestedStart, timeZone);

	const targetDaySpan = Interval.fromDateTimes(
		requestedStart.startOf('day'),
		requestedStart.endOf('day')
	);

	const employeeResults = calculateEmployeeSlots(
		employeesToUse,
		engine,
		targetDaySpan,
		orgIntervals,
		requestedStart,
		timeZone
	);

	// 4. Bepaal de beste medewerker (minste boekingen) voor dit specifieke slot
	let bestEmployeeId: string | null = null;
	let minBookings = Infinity;

	for (let i = 0; i < employeesToUse.length; i++) {
		const emp = employeesToUse[i];
		const result = employeeResults[i];

		// Check of de medewerker een slot heeft dat (nagenoeg) exact overeenkomt
		const isAvailable = result.intervals.some(
			(slot) =>
				Math.abs(slot.start!.toMillis() - requestedStart.toMillis()) < 60000 &&
				Math.abs(slot.end!.toMillis() - requestedEnd.toMillis()) < 60000
		);

		if (isAvailable) {
			// calendarItems bevatten de boekingen voor die dag (opgehaald in fetchBookingData)
			const bookingCount = emp.member.calendarItems.length;
			if (bookingCount < minBookings) {
				minBookings = bookingCount;
				bestEmployeeId = emp.member.id;
			}
		}
	}

	if (!bestEmployeeId) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'slot_not_available' });
	}

	const bestEmployee = employeesToUse.find((e) => e.member.id === bestEmployeeId)!.member;

	// 5. User / Customer Upsert (Originele logica behouden)
	const ctxAuth = await auth.$context;
	let user = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, contact.email) });

	if (!user) {
		user = await ctxAuth.internalAdapter.createUser({
			email: contact.email,
			name: `${contact.firstName} ${contact.lastName}`,
			phone: contact.phone || '',
			organizationId: organizationId
		});
	}

	// Drizzle does not have upsert, so try update, then insert if not found
	let customer = await db.query.customer.findFirst({
		where: (c, { and, eq }) => and(eq(c.email, contact.email), eq(c.organizationId, organizationId))
	});
	if (customer) {
		await db
			.update(schema.customer)
			.set({
				name: `${contact.firstName} ${contact.lastName}`,
				phone: contact.phone || '',
				userId: user.id
			})
			.where(
				and(
					eq(schema.customer.email, contact.email),
					eq(schema.customer.organizationId, organizationId)
				)
			);
		// re-fetch to get updated
		customer = await db.query.customer.findFirst({
			where: (c, { and, eq }) =>
				and(eq(c.email, contact.email), eq(c.organizationId, organizationId))
		});
	} else {
		const inserted = await db
			.insert(schema.customer)
			.values({
				id: crypto.randomUUID(),
				name: `${contact.firstName} ${contact.lastName}`,
				email: contact.email,
				phone: contact.phone || '',
				organizationId,
				userId: user.id
			})
			.returning();
		customer = inserted[0];
	}

	// 6. Auth Magic Link (Originele logica)
	const magicLink = await auth.api
		.signInMagicLink({
			headers,
			body: {
				email: contact.email,
				callbackURL: `/appointments/${organization.id}`
			}
		})
		.catch((e) => {
			console.error('Magic link error:', e);
			throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'magic_link_error' });
		});

	let magicLinkVerification;
	if (magicLink.status) {
		magicLinkVerification = await db.query.verification.findFirst({
			where: (v, { and, eq, gte }) =>
				and(eq(v.value, `{"email":"${contact.email}"}`), gte(v.expiresAt, new Date())),
			orderBy: (v, { desc }) => desc(v.createdAt)
		});
		if (magicLinkVerification) {
			await db.insert(schema.verification).values({
				id: crypto.randomUUID(),
				identifier: magicLinkVerification.identifier,
				value: magicLinkVerification.value,
				expiresAt: magicLinkVerification.expiresAt
			});
		}
	}

	// 7. Booking & CalendarItem aanmaken
	const [booking] = await db
		.insert(schema.booking)
		.values({
			id: crypto.randomUUID(),
			organizationId,
			serviceId,
			employeeId: bestEmployee.id,
			customerId: customer?.id ?? '',
			duration: service.duration,
			notes: contact.notes,
			status: (organization.appointmentStatus as string) || 'PENDING'
		})
		.returning();

	const [calendarItem] = await db
		.insert(schema.calendarItem)
		.values({
			id: crypto.randomUUID(),
			organizationId,
			title: `${customer?.name} - ${service.name}`,
			employeeId: bestEmployee.id,
			startTime: requestedStart.toJSDate(),
			endTime: requestedEnd.toJSDate(),
			type: 'BOOKING',
			notes: contact.notes,
			bookingId: booking.id,
			updatedAt: new Date()
		})
		.returning();

	// 8. Notificatie (Originele logica)
	const encode = encodeURIComponent;
	const panel = {
		url: `${url}/api/auth/magic-link/verify?token=${magicLinkVerification?.identifier ?? ''}&callbackURL=${encode(`/app/appointments/${organization.id}?email=${contact.email}`)}`,
		cancel: `${url}/api/auth/magic-link/verify?token=${encode(magicLinkVerification?.identifier ?? '')}&callbackURL=${encode(`${env?.PUBLIC_FRONTEND_URL}/app/appointments/${organization.id}?email=${contact.email}&cancel=${calendarItem.id}`)}`
	};

	// Haal user email van employee op via de meegeleverde include in fetchBookingData (als je die daar hebt, anders extra query nodig)
	const employeeUser = await db.query.user.findFirst({
		where: (u, { eq }) => eq(u.id, bestEmployee.userId)
	});

	const membersForNotification = (employeesToUse as any[]).map((emp) => ({
		...emp.member,
		services: [],
		calendarItems: emp.member.calendarItems,
		availabilities: emp.member.availabilities,
		// @ts-ignore
		user: emp.user
	}));

	if (emailQueue && booking.status === 'PENDING') {
		const baseJob = {
			version: 'v2' as const,
			templateType: 'EMAIL_CREATED',
			organizationId,
			bookingId: booking.id
		};

		const customerJob: EmailQueueMessage = {
			...baseJob,
			targetAudience: 'CUSTOMER'
		};

		const employeeJob: EmailQueueMessage = {
			...baseJob,
			targetAudience: 'EMPLOYEE'
		};

		await Promise.all([emailQueue.send(customerJob), emailQueue.send(employeeJob)]);
	}

	// await notificationService.sendEmailNotification({
	// 	type: organization.appointmentStatus === 'CONFIRMED' ? 'EMAIL_APPROVED' : 'EMAIL_CREATED',
	// 	to: contact.email,
	// 	employeeEmail: employeeUser?.email || '',
	// 	variables: {
	// 		customer: {
	// 			name: customer?.name,
	// 			email: customer?.email,
	// 			phone: customer?.phone,
	// 			panel
	// 		},
	// 		booking: {
	// 			name: service.name,
	// 			employee: employeeUser?.name || '',
	// 			employeeId: bestEmployee.id,
	// 			serviceId: service.id,
	// 			serviceDuration: service.duration,
	// 			servicePrice: service.price,
	// 			serviceDescription: service.description,
	// 			panel,
	// 			start: {
	// 				date: requestedStart.toFormat('yyyy-MM-dd'),
	// 				year: requestedStart.year,
	// 				month: requestedStart.month,
	// 				day: requestedStart.day,
	// 				hour: requestedStart.hour.toString().padStart(2, '0'),
	// 				minute: requestedStart.minute.toString().padStart(2, '0')
	// 			},
	// 			end: {
	// 				date: requestedEnd.toFormat('yyyy-MM-dd'),
	// 				year: requestedEnd.year,
	// 				month: requestedEnd.month,
	// 				day: requestedEnd.day,
	// 				hour: requestedEnd.hour.toString().padStart(2, '0'),
	// 				minute: requestedEnd.minute.toString().padStart(2, '0')
	// 			}
	// 		}
	// 	},
	// 	branch: {
	// 		...organization,
	// 		members: membersForNotification,
	// 		services: [service]
	// 	}
	// });

	return { booking, calendarItem };
};
