import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import { prisma } from '$lib/server/prisma';
import { AvailabilityEngine } from '@salora/scheduler';
import {
	fetchBookingData,
	calculateEmployeeSlots,
	getIntervalsForDate
} from '$lib/services/availability.service';
import type { CreateBookingInput } from './booking.schema';
import type { PortalProcedureContext } from '../../context';

// Let op: pas de onderstaande imports aan naar jouw daadwerkelijke paden
import { auth } from '$lib/server/auth';
import { env } from '$lib/server/env';
import { notificationService } from '$lib/server/NotificationService';

type CreateBookingOpts = {
	ctx: PortalProcedureContext;
	input: CreateBookingInput;
};

export const createBookingHandler = async ({ input, ctx }: CreateBookingOpts) => {
	const { organizationId, serviceId, employeeId, date, contact } = input;

	// 1. Haal de globale organisatie- en service data op voor deze dag
	// Gebruik UTC als tussenstap om de juiste dag-span op te halen
	const initialTargetDate = DateTime.fromJSDate(date).setZone('UTC', { keepLocalTime: true });
	const fullSearchSpan = Interval.fromDateTimes(
		initialTargetDate.startOf('day'),
		initialTargetDate.endOf('day')
	);

	const { organization, service, employees } = await fetchBookingData(
		organizationId,
		serviceId,
		fullSearchSpan
	);

	const timeZone = organization.timeZone || 'UTC';

	// 2. Definieer het specifieke gezochte interval
	const requestedStart = DateTime.fromJSDate(date, { zone: timeZone });
	const requestedEnd = requestedStart.plus({ minutes: service.duration });
	const requestedInterval = Interval.fromDateTimes(requestedStart, requestedEnd);

	if (!requestedInterval.isValid) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'ongeldige_datum' });
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
	const engine = new AvailabilityEngine().useDefaultPipeline().withConfig({
		slotDurationMinutes: service.duration,
		bufferMinutes: 0,
		gridStrategy: organization.autoShiftTimeSlot ? 'flexible' : 'fixed'
	});

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
	let user = await prisma.user.findUnique({ where: { email: contact.email } });

	if (!user) {
		user = await ctxAuth.internalAdapter.createUser({
			email: contact.email,
			name: `${contact.firstName} ${contact.lastName}`,
			phone: contact.phone?.number?.toString() || '',
			organizationId: organizationId
		});
	}

	const customer = await prisma.customer.upsert({
		where: {
			email_organizationId: {
				email: contact.email,
				organizationId
			}
		},
		update: {
			name: `${contact.firstName} ${contact.lastName}`,
			phone: contact.phone?.formattedNumber ?? '',
			user: { connect: { id: user.id } }
		},
		create: {
			name: `${contact.firstName} ${contact.lastName}`,
			email: contact.email,
			phone: contact.phone?.formattedNumber ?? '',
			organizationId,
			userId: user.id
		}
	});

	// 6. Auth Magic Link (Originele logica)
	const magicLink = await auth.api
		.signInMagicLink({
			headers: ctx.headers,
			body: {
				email: contact.email,
				callbackURL: `${env?.PUBLIC_BACKEND_URL }/appointments/${organization.id}`
			}
		})
		.catch((e) => {
			console.error('Magic link error:', e);
			throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'magic_link_error' });
		});

	let magicLinkVerification;
	if (magicLink.status) {
		magicLinkVerification = await prisma.verification.findFirst({
			where: {
				value: { equals: `{"email":"${contact.email}"}` },
				expiresAt: { gte: new Date() }
			},
			orderBy: { createdAt: 'desc' }
		});

		if (magicLinkVerification) {
			await prisma.verification.create({
				data: {
					id: crypto.randomUUID(),
					identifier: magicLinkVerification.identifier,
					value: magicLinkVerification.value,
					expiresAt: magicLinkVerification.expiresAt
				}
			});
		}
	}

	// 7. Booking & CalendarItem aanmaken
	const booking = await prisma.booking.create({
		data: {
			organizationId,
			serviceId,
			employeeId: bestEmployee.id,
			customerId: customer.id,
			duration: service.duration,
			notes: contact.notes,
			status: organization.appointmentStatus || 'PENDING'
		}
	});

	const calendarItem = await prisma.calendarItem.create({
		data: {
			organizationId,
			title: `${customer.name} - ${service.name}`,
			memberId: bestEmployee.id,
			startTime: requestedStart.toJSDate(),
			endTime: requestedEnd.toJSDate(),
			type: 'BOOKING',
			notes: contact.notes,
			bookingId: booking.id
		}
	});

	// 8. Notificatie (Originele logica)
	const encode = encodeURIComponent;
	const panel = {
		url: `${env?.PUBLIC_BACKEND_URL }/api/auth/magic-link/verify?token=${magicLinkVerification?.identifier ?? ''}&callbackURL=${encode(`/app/appointments/${organization.id}?email=${contact.email}`)}`,
		cancel: `${env?.PUBLIC_BACKEND_URL }/api/auth/magic-link/verify?token=${encode(magicLinkVerification?.identifier ?? '')}&callbackURL=${encode(`${env?.PUBLIC_FRONTEND_URL}/app/appointments/${organization.id}?email=${contact.email}&cancel=${calendarItem.id}`)}`
	};

	// Haal user email van employee op via de meegeleverde include in fetchBookingData (als je die daar hebt, anders extra query nodig)
	const employeeUser = await prisma.user.findUnique({ where: { id: bestEmployee.userId } });

	const membersForNotification = employeesToUse.map((emp) => ({
		...emp.member,
		services: [],
		calendarItems: emp.member.calendarItems,
		availability: emp.member.availability,
		// @ts-ignore
		user: emp.user
	}));

	await notificationService.sendEmailNotification({
		type: organization.appointmentStatus === 'CONFIRMED' ? 'EMAIL_APPROVED' : 'EMAIL_CREATED',
		to: contact.email,
		employeeEmail: employeeUser?.email || '',
		variables: {
			customer: {
				name: customer.name,
				email: customer.email,
				phone: customer.phone,
				panel
			},
			booking: {
				name: service.name,
				employee: employeeUser?.name || '',
				employeeId: bestEmployee.id,
				serviceId: service.id,
				serviceDuration: service.duration,
				servicePrice: service.price,
				serviceDescription: service.description,
				panel,
				start: {
					date: requestedStart.toFormat('yyyy-MM-dd'),
					year: requestedStart.year,
					month: requestedStart.month,
					day: requestedStart.day,
					hour: requestedStart.hour.toString().padStart(2, '0'),
					minute: requestedStart.minute.toString().padStart(2, '0')
				},
				end: {
					date: requestedEnd.toFormat('yyyy-MM-dd'),
					year: requestedEnd.year,
					month: requestedEnd.month,
					day: requestedEnd.day,
					hour: requestedEnd.hour.toString().padStart(2, '0'),
					minute: requestedEnd.minute.toString().padStart(2, '0')
				}
			}
		},
		branch: {
			...organization,
			members: membersForNotification,
			services: [service]
		}
	});

	return { booking, calendarItem };
};
