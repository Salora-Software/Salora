import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import type { ImportAmeliaDataInput, ImportAmeliaDataOutput } from './import.schema';
import type { PrivateContext } from '$lib/server/trpc/context';
import { randomUUID } from 'crypto';
import { getAmeliaDataFromMySQL } from '$lib/server/importscripts';

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
// Clean up existing data before importing (users/customers, products/services, and their related bookings/calendar items)
await db.delete(schema.booking).where(eq(schema.booking.organizationId, organizationId)).execute();
await db.delete(schema.calendarItem).where(and(eq(schema.calendarItem.organizationId, organizationId), eq(schema.calendarItem.type, "BOOKING"))).execute();
await db.delete(schema.customer).where(eq(schema.customer.organizationId, organizationId)).execute();
await db.delete(schema.service).where(eq(schema.service.organizationId, organizationId)).execute();

const ameliaData = await getAmeliaDataFromMySQL();

let customersImported = 0;
let servicesImported = 0;
let bookingsImported = 0;

const ameliaToSaloraCustomers = new Map<string | number, string>();
const ameliaToSaloraServices = new Map<string | number, string>();

const existingCustomers = await db.query.customer.findMany({
where: eq(schema.customer.organizationId, organizationId)
});
const existingServices = await db.query.service.findMany({
where: eq(schema.service.organizationId, organizationId)
});
const existingCalendarItems = await db.query.calendarItem.findMany({
where: and(
eq(schema.calendarItem.organizationId, organizationId),
eq(schema.calendarItem.type, "BOOKING")
)
});

const existingMembers = await db.query.member.findMany({
where: eq(schema.member.organizationId, organizationId)
});
const defaultEmployeeId = existingMembers.length > 0 ? existingMembers[0].id : null;

const findExistingCustomer = (email: string, phone?: string) => {
return existingCustomers.find(c => (c.email !== 'unknown@example.com' && c.email === email) || (phone && c.phone === phone));
};

const findExistingService = (name: string) => {
return existingServices.find(s => s.name === name);
};

// 1. Prepare Customers
if (ameliaData.customers && Array.isArray(ameliaData.customers)) {
for (const ameliaCustomer of ameliaData.customers) {
const email = ameliaCustomer.email || 'unknown@example.com';
const phone = ameliaCustomer.phone || undefined;
const existing = findExistingCustomer(email, phone);

if (existing) {
ameliaToSaloraCustomers.set(ameliaCustomer.id, existing.id);
} else {
const customerId = randomUUID();
try {
const customerName = `${ameliaCustomer.firstName} ${ameliaCustomer.lastName}`.trim() || 'Unknown';
await db.insert(schema.customer).values({
id: customerId,
name: customerName,
email,
phone: phone || null,
address: null,
organizationId,
userId: null,
authToken: null
});
customersImported++;
existingCustomers.push({ id: customerId, email, phone: phone || null, name: customerName } as any);
ameliaToSaloraCustomers.set(ameliaCustomer.id, customerId);
} catch (e) {
console.error(`Failed to insert customer ${ameliaCustomer.id}`, e);
}
}
}
}

// 2. Prepare Services
if (ameliaData.services && Array.isArray(ameliaData.services)) {
for (const ameliaService of ameliaData.services) {
const existing = findExistingService(ameliaService.name);

if (existing) {
ameliaToSaloraServices.set(ameliaService.id, existing.id);
} else {
const serviceId = randomUUID();
try {
const durationInMinutes = ameliaService.duration ? Math.floor(ameliaService.duration / 60) : 60;
await db.insert(schema.service).values({
id: serviceId,
name: ameliaService.name || 'Unknown Service',
description: null,
sortingIndex: -1,
duration: durationInMinutes,
price: ameliaService.price || 0,
organizationId,
visible: true
});
servicesImported++;
existingServices.push({ id: serviceId, name: ameliaService.name || 'Unknown Service' } as any);
ameliaToSaloraServices.set(ameliaService.id, serviceId);
} catch (e) {
console.error(`Failed to insert service ${ameliaService.id}`, e);
}
}
}
}

// 3. Prepare Appointments as Bookings
if (ameliaData.appointments && Array.isArray(ameliaData.appointments)) {
for (const ameliaAppointment of ameliaData.appointments) {
let customerId = ameliaToSaloraCustomers.get(ameliaAppointment.customerId);
let serviceId = ameliaToSaloraServices.get(ameliaAppointment.serviceId);

if (!customerId || !serviceId) continue;

// Skip if calendarItem already exists for this timeframe and customer
const startTimeStr = new Date(ameliaAppointment.bookingStart);
const endTimeStr = ameliaAppointment.bookingEnd ? new Date(ameliaAppointment.bookingEnd) : new Date(startTimeStr.getTime() + 60 * 60 * 1000);

if (isNaN(startTimeStr.getTime())) continue;

const timeOffsetMatch = Math.floor(startTimeStr.getTime() / 1000) * 1000;
// naive check
const existingAppt = existingCalendarItems.find(c => {
// For mode="timestamp", c.startTime is expected to be a Date object generally, but let's check its time
                    if (!c.startTime) return false;
const cTime = new Date(c.startTime as any).getTime();
return Math.abs(cTime - startTimeStr.getTime()) < 2000; // within 2 seconds
});

if (existingAppt) {
continue;
}

const StatusMap: Record<string, 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'> = {
'pending': 'PENDING',
'confirmed': 'CONFIRMED',
'cancelled': 'CANCELLED',
'completed': 'COMPLETED'
};

const status = StatusMap[(ameliaAppointment.status || '').toLowerCase()] || 'CONFIRMED';
const bookingId = randomUUID();
const createdDate = ameliaAppointment.created ? new Date(ameliaAppointment.created) : new Date();

const customer = existingCustomers.find(c => c.id === customerId);
const service = existingServices.find(s => s.id === serviceId);
const appointmentTitle = `${customer?.name || 'Unknown Customer'} - ${service?.name || 'Unknown Service'}`;
const fallbackDuration = service && 'duration' in service ? (service as any).duration : 60;

try {
await db.insert(schema.booking).values({
id: bookingId,
serviceId,
customerId,
organizationId,
employeeId: defaultEmployeeId,
userId: null,
duration: fallbackDuration,
notes: ameliaAppointment.internalNotes || null,
status,
createdAt: createdDate,
updatedAt: createdDate
});

const calendarItemId = randomUUID();
await db.insert(schema.calendarItem).values({
id: calendarItemId,
organizationId,
title: appointmentTitle,
employeeId: defaultEmployeeId,
startTime: startTimeStr,
endTime: endTimeStr,
type: "BOOKING",
notes: ameliaAppointment.internalNotes || null,
bookingId: bookingId,
createdAt: createdDate,
updatedAt: createdDate
});

bookingsImported++;
existingCalendarItems.push({ 
id: calendarItemId, 
startTime: startTimeStr as any, 
type: "BOOKING" 
} as any);

} catch (err) {
console.error(`Failed to insert booking`, err);
}
}
}

return {
customersImported,
servicesImported,
bookingsImported,
message: `Successfully synced ${customersImported} customers, ${servicesImported} services, and ${bookingsImported} appointments.`
};
} catch (error) {
const message = error instanceof Error ? error.message : 'Unknown error occurred';
throw new TRPCError({
code: 'INTERNAL_SERVER_ERROR',
message: `Failed to sync Amelia data: ${message}`
});
}
};
