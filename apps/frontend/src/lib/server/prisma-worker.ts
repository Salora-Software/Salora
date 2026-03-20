import type { PrismaClient } from '@salora/database';
import {
	createWorkerClient,
	type WorkerDatabaseBinding
} from '@salora/database/worker';

let workerPrisma: PrismaClient | null = null;

export const initializeWorkerPrisma = (database?: WorkerDatabaseBinding) => {
	if (!database || workerPrisma) return;
	workerPrisma = createWorkerClient(database) as unknown as PrismaClient;
};

const getPrismaClient = (): PrismaClient => {
    if (!workerPrisma) {
        throw new Error('Workers runtime missing DATABASE binding initialization');
    }
    return workerPrisma;
};

export const prisma = new Proxy({} as PrismaClient, {
	get(_target: any, prop: PropertyKey, receiver: any) {
		const client = getPrismaClient();
		const value = Reflect.get(client as any, prop, receiver);

		if (typeof value === 'function') {
			return (value as Function).bind(client);
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
