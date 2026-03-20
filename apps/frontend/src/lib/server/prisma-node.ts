import type { PrismaClient } from '@salora/database';
import { createClient as createNodeClient } from '@salora/database/node';
import type { WorkerDatabaseBinding } from '@salora/database/worker';
import { env } from '$env/dynamic/private';

const nodePrisma = createNodeClient(env?.DATABASE_URL);

export const initializeWorkerPrisma = (database?: WorkerDatabaseBinding) => {
	// No-op in Node environment
    // We import type only so it doesn't try to bundle worker deps
};

export const prisma = new Proxy({} as PrismaClient, {
	get(_target: any, prop: PropertyKey, receiver: any) {
		const value = Reflect.get(nodePrisma as any, prop, receiver);

		if (typeof value === 'function') {
			return (value as Function).bind(nodePrisma);
		}

		return value;
	}
}) as any as PrismaClient;

export async function upsertCustomer(
	name: string,
	email: string,
	phone: string,
	organizationId: string
) {
	return await prisma.customer.upsert({
		where: { email_organizationId: { email, organizationId } },
		update: { name, phone },
		create: { name, email, phone, organizationId }
	});
}

export async function createBooking(options: {
	organizationId: string;
	serviceId: string;
	serviceName: string;
	employeeId: string;
	customerId: string;
	customerName: string;
	date: Date;
	duration: number;
	notes: string;
}) {
	const {
		organizationId,
		serviceId,
		serviceName,
		employeeId,
		customerId,
		customerName,
		date,
		duration,
		notes
	} = options;
	const endTime = new Date(date.getTime() + duration * 60000);

	const calendarItem = await prisma.calendarItem.create({
		data: {
			startTime: date,
			endTime: endTime,
			memberId: employeeId,
			organizationId,
			title: `${customerName} - ${serviceName}`,
			type: 'BOOKING' // if you're using enum types
		}
	});

	const booking = await prisma.booking.create({
		data: {
			status: 'PENDING',
			organizationId,
			serviceId,
			customerId,
			duration,
			notes,
			employeeId,
			calendarItem: {
				connect: {
					id: calendarItem.id
				}
			}
		}
	});

	return booking;
}

export async function getCommunications(organizationId: string) {
	let communications = await prisma.communicationSetting.findMany({
		where: {
			organizationId: organizationId!
		}
	});
	return communications.map((communication) => {
		if (
			typeof communication.settings !== 'object' ||
			communication.settings === null ||
			Array.isArray(communication.settings)
		) {
			return { ...communication, settings: {} };
		}
		const settings = communication.settings as Record<string, any>;
		return {
			...communication,
			enabled: communication.enabled,
			type: communication.type,
			smtpPort: settings.smtpPort as number,
			smtpServer: settings.smtpServer as string,
			smtpUsername: settings.smtpUsername as string,
			smtpPassword: settings.smtpPassword as string,
			smsProvider: settings.smsProvider as string,
			smsApiKey: settings.smsApiKey as string,
			smtpEmail: settings.smtpEmail as string
		};
	});
}
