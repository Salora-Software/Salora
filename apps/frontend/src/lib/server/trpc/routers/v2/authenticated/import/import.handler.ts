import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import type { ImportAmeliaDataInput, ImportAmeliaDataOutput } from './import.schema';
import type { PrivateContext } from '$lib/server/trpc/context';
import { randomUUID } from 'crypto';
import { getAmeliaDataFromMySQL } from '$lib/server/importscripts';

// Helper to chunk arrays
const chunkArray = <T>(array: T[], size: number): T[][] => {
	const chunked = [];
	for (let i = 0; i < array.length; i += size) {
		chunked.push(array.slice(i, i + size));
	}
	return chunked;
};

export const importAmeliaDataHandler = async ({
	input: { organizationId },
	ctx: { session, db }
}: {
	input: ImportAmeliaDataInput;
	ctx: PrivateContext;
}): Promise<ImportAmeliaDataOutput> => {
	if (!session) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'You must be authenticated to import data'
		});
	}

	try {
		console.log('[IMPORT] Starting Amelia data import for organization:', organizationId);
		const ameliaData = await getAmeliaDataFromMySQL();
		console.log('[IMPORT] Fetched Amelia data:', {
			customers: ameliaData.customers?.length || 0,
			services: ameliaData.services?.length || 0,
			appointments: ameliaData.appointments?.length || 0
		});

		let customersImported = 0;
		let customersUpdated = 0;
		let servicesImported = 0;
		let servicesUpdated = 0;
		let bookingsImported = 0;
		let bookingsUpdated = 0;

		const ameliaToSaloraCustomers = new Map<string | number, string>();
		const ameliaToSaloraServices = new Map<string | number, string>();

		const [existingCustomers, existingServices, existingCalendarItems, existingMembers] =
			await Promise.all([
				db.query.customer.findMany({ where: eq(schema.customer.organizationId, organizationId) }),
				db.query.service.findMany({ where: eq(schema.service.organizationId, organizationId) }),
				db.query.calendarItem.findMany({
					where: and(
						eq(schema.calendarItem.organizationId, organizationId),
						eq(schema.calendarItem.type, 'BOOKING')
					)
				}),
				db.query.member.findMany({ where: eq(schema.member.organizationId, organizationId) })
			]);

		console.log('[IMPORT] Fetched existing data:', {
			customers: existingCustomers.length,
			services: existingServices.length,
			calendarItems: existingCalendarItems.length,
			members: existingMembers.length
		});

		const defaultEmployeeId = '1ed695e3-dcf4-431f-b6d6-eb99ec7a841e';

		// Calculate earliest created dates per customer and service from appointments
		const earliestCustomerDates = new Map<string | number, Date>();
		const earliestServiceDates = new Map<string | number, Date>();

		if (ameliaData.appointments && Array.isArray(ameliaData.appointments)) {
			for (const appt of ameliaData.appointments) {
				const apptDate = appt.created ? new Date(appt.created) : new Date();
				if (!isNaN(apptDate.getTime())) {
					const cDate = earliestCustomerDates.get(appt.customerId);
					if (!cDate || apptDate < cDate) earliestCustomerDates.set(appt.customerId, apptDate);

					const sDate = earliestServiceDates.get(appt.serviceId);
					if (!sDate || apptDate < sDate) earliestServiceDates.set(appt.serviceId, apptDate);
				}
			}
		}

		// Batches for inserts
		const customersToInsert: any[] = [];
		const customerUpdates: Promise<any>[] = [];
		const servicesToInsert: any[] = [];
		const serviceUpdates: Promise<any>[] = [];

		// 1. Process Services
		if (ameliaData.services && Array.isArray(ameliaData.services)) {
			console.log('[IMPORT] Processing', ameliaData.services.length, 'services...');
			for (const ameliaService of ameliaData.services) {
				const existingService = existingServices.find((s) => s.name === ameliaService.name);
				const durationInMinutes = ameliaService.duration
					? Math.floor(ameliaService.duration / 60)
					: 60;
				const serviceCreatedAt = earliestServiceDates.get(ameliaService.id) || new Date();

				if (existingService) {
					serviceUpdates.push(
						db
							.update(schema.service)
							.set({
								duration: durationInMinutes,
								price: ameliaService.price || existingService.price,
								createdAt: serviceCreatedAt, // Update timestamp so it matches first use
								updatedAt: new Date()
							})
							.where(eq(schema.service.id, existingService.id))
							.execute()
					);
					ameliaToSaloraServices.set(ameliaService.id, existingService.id);
					servicesUpdated++;
				} else {
					const saloraServiceId = randomUUID();
					servicesToInsert.push({
						id: saloraServiceId,
						name: ameliaService.name || 'Unknown Service',
						description: null,
						sortingIndex: -1,
						duration: durationInMinutes,
						price: ameliaService.price || 0,
						organizationId,
						visible: true,
						createdAt: serviceCreatedAt,
						updatedAt: serviceCreatedAt
					});
					ameliaToSaloraServices.set(ameliaService.id, saloraServiceId);
					existingServices.push({
						id: saloraServiceId,
						name: ameliaService.name || 'Unknown Service',
						duration: durationInMinutes
					} as any);
					servicesImported++;
				}
			}
			console.log('[IMPORT] Services processed:', {
				toInsert: servicesToInsert.length,
				toUpdate: serviceUpdates.length
			});
		}

		// 2. Process Customers
		const emailMap = new Map(existingCustomers.map((c) => [c.email, c]));
		const phoneMap = new Map(existingCustomers.filter((c) => c.phone).map((c) => [c.phone, c]));
		const nameMap = new Map(existingCustomers.map((c) => [c.name.toLowerCase(), c]));

		if (ameliaData.customers && Array.isArray(ameliaData.customers)) {
			console.log('[IMPORT] Processing', ameliaData.customers.length, 'customers...');
			for (const ameliaCustomer of ameliaData.customers) {
				const email = ameliaCustomer.email || null;
				const phone = ameliaCustomer.phone || null;
				const customerName =
					`${ameliaCustomer.firstName} ${ameliaCustomer.lastName}`.trim() || 'Unknown';
				const customerCreatedAt = earliestCustomerDates.get(ameliaCustomer.id) || new Date();

				let existingCustomer = null;
				if (email && emailMap.has(email)) existingCustomer = emailMap.get(email);
				if (!existingCustomer && phone && phoneMap.has(phone))
					existingCustomer = phoneMap.get(phone);
				if (!existingCustomer && nameMap.has(customerName.toLowerCase()))
					existingCustomer = nameMap.get(customerName.toLowerCase());

				if (existingCustomer) {
					customerUpdates.push(
						db
							.update(schema.customer)
							.set({
								name: customerName,
								phone: phone || existingCustomer.phone,
								email: email || existingCustomer.email,
								createdAt: customerCreatedAt, // Ensure the historical true createdAt is recorded
								updatedAt: new Date()
							})
							.where(eq(schema.customer.id, existingCustomer.id))
							.execute()
					);
					ameliaToSaloraCustomers.set(ameliaCustomer.id, existingCustomer.id);
					customersUpdated++;
				} else {
					const saloraCustomerId = randomUUID();
					const safeEmail = email || `unknown-${ameliaCustomer.id}@placeholder.local`;
					customersToInsert.push({
						id: saloraCustomerId,
						name: customerName,
						email: safeEmail,
						phone,
						address: null,
						organizationId,
						userId: null,
						authToken: null,
						createdAt: customerCreatedAt,
						updatedAt: customerCreatedAt
					});
					const newCustomer = {
						id: saloraCustomerId,
						email: safeEmail,
						phone,
						name: customerName
					} as any;
					existingCustomers.push(newCustomer);
					emailMap.set(safeEmail, newCustomer);
					if (phone) phoneMap.set(phone, newCustomer);
					nameMap.set(customerName.toLowerCase(), newCustomer);
					ameliaToSaloraCustomers.set(ameliaCustomer.id, saloraCustomerId);
					customersImported++;
				}
			}
			console.log('[IMPORT] Customers processed:', {
				toInsert: customersToInsert.length,
				toUpdate: customerUpdates.length
			});
		}

		// 3. Process Appointments (Bookings & Calendar Items)
		const bookingsToInsert: any[] = [];
		const calendarItemsToInsert: any[] = [];
		const bookingUpdates: Promise<any>[] = [];

		if (ameliaData.appointments && Array.isArray(ameliaData.appointments)) {
			console.log('[IMPORT] Processing', ameliaData.appointments.length, 'appointments...');
			// Create a quick lookup for existing calendar items by time
			const calendarItemTimes = existingCalendarItems
				.filter((c) => c.startTime)
				.map((c) => ({
					id: c.id,
					bookingId: c.bookingId,
					time: new Date(c.startTime as any).getTime()
				}));

			for (const ameliaAppointment of ameliaData.appointments) {
				const saloraCustomerId = ameliaToSaloraCustomers.get(ameliaAppointment.customerId);
				const saloraServiceId = ameliaToSaloraServices.get(ameliaAppointment.serviceId);

				if (!saloraCustomerId || !saloraServiceId) continue;

				const startTimeStr = new Date(ameliaAppointment.bookingStart);
				const endTimeStr = ameliaAppointment.bookingEnd
					? new Date(ameliaAppointment.bookingEnd)
					: new Date(startTimeStr.getTime() + 60 * 60 * 1000);

				if (isNaN(startTimeStr.getTime())) continue;

				const StatusMap: Record<string, 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'> = {
					pending: 'PENDING',
					confirmed: 'CONFIRMED',
					cancelled: 'CANCELLED',
					completed: 'COMPLETED'
				};
				const status = StatusMap[(ameliaAppointment.status || '').toLowerCase()] || 'CONFIRMED';
				const notes = ameliaAppointment.internalNotes || null;

				const targetTime = startTimeStr.getTime();
				const existingAppt = calendarItemTimes.find((c) => Math.abs(c.time - targetTime) < 2000);

				if (existingAppt && existingAppt.bookingId) {
					bookingUpdates.push(
						db
							.update(schema.booking)
							.set({ status, notes, updatedAt: new Date() })
							.where(eq(schema.booking.id, existingAppt.bookingId))
							.execute()
					);
					bookingUpdates.push(
						db
							.update(schema.calendarItem)
							.set({ notes, updatedAt: new Date() })
							.where(eq(schema.calendarItem.id, existingAppt.id))
							.execute()
					);
					bookingsUpdated++;
					continue;
				}

				// Generate New Booking
				const bookingId = randomUUID();
				const createdDate = ameliaAppointment.created
					? new Date(ameliaAppointment.created)
					: new Date();
				const customer = existingCustomers.find((c) => c.id === saloraCustomerId);
				const service = existingServices.find((s) => s.id === saloraServiceId);
				const appointmentTitle = `${customer?.name || 'Unknown Customer'} - ${service?.name || 'Unknown Service'}`;
				const fallbackDuration = service && 'duration' in service ? (service as any).duration : 60;

				bookingsToInsert.push({
					id: bookingId,
					serviceId: saloraServiceId,
					customerId: saloraCustomerId,
					organizationId,
					employeeId: defaultEmployeeId,
					userId: null,
					duration: fallbackDuration,
					notes,
					status,
					createdAt: createdDate,
					updatedAt: createdDate
				});

				calendarItemsToInsert.push({
					id: randomUUID(),
					organizationId,
					title: appointmentTitle,
					employeeId: defaultEmployeeId,
					startTime: startTimeStr,
					endTime: endTimeStr,
					type: 'BOOKING',
					notes,
					bookingId: bookingId,
					createdAt: createdDate,
					updatedAt: createdDate
				});

				calendarItemTimes.push({ id: 'new', bookingId, time: targetTime });
				bookingsImported++;
			}
			console.log('[IMPORT] Appointments processed:', {
				toInsert: bookingsToInsert.length,
				toUpdate: bookingUpdates.length
			});
		}

		// Execute Batch Queries
		const CHUNK_SIZE = 5; // Safe batch size for SQLite variables overhead

		// Run bulk inserts in chunks
		console.log('[IMPORT] Executing batch inserts...');
		for (const chunk of chunkArray(servicesToInsert, CHUNK_SIZE)) {
			console.log(`[IMPORT] Inserting ${chunk.length} services...`);
			await db.insert(schema.service).values(chunk).execute();
		}
		for (const chunk of chunkArray(customersToInsert, CHUNK_SIZE)) {
			console.log(`[IMPORT] Inserting ${chunk.length} customers...`);
			await db.insert(schema.customer).values(chunk).execute();
		}
		for (const chunk of chunkArray(bookingsToInsert, CHUNK_SIZE)) {
			console.log(`[IMPORT] Inserting ${chunk.length} bookings...`);
			await db.insert(schema.booking).values(chunk).execute();
		}
		for (const chunk of chunkArray(calendarItemsToInsert, CHUNK_SIZE)) {
			console.log(`[IMPORT] Inserting ${chunk.length} calendar items...`);
			await db.insert(schema.calendarItem).values(chunk).execute();
		}

		// Run grouped updates concurrently using Promise.all chunks
		console.log('[IMPORT] Executing batch updates...');
		for (const chunk of chunkArray(
			[...serviceUpdates, ...customerUpdates, ...bookingUpdates],
			50
		)) {
			console.log(`[IMPORT] Updating ${chunk.length} records...`);
			await Promise.all(chunk);
		}

		console.log('[IMPORT] Import completed successfully:', {
			customersImported,
			customersUpdated,
			servicesImported,
			servicesUpdated,
			bookingsImported,
			bookingsUpdated
		});

		return {
			customersImported,
			servicesImported,
			bookingsImported,
			message: `Sync compleet. Geïmporteerd: ${customersImported} klanten, ${servicesImported} diensten, ${bookingsImported} boekingen. Geüpdatet: ${customersUpdated} klanten, ${servicesUpdated} diensten, ${bookingsUpdated} boekingen.`
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error occurred';
		console.error('[IMPORT] Error during import:', {
			message,
			stack: error instanceof Error ? error.stack : undefined
		});
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: `Failed to sync Amelia data: ${message}`
		});
	}
};
