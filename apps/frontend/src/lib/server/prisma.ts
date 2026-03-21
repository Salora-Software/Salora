import { createClient, type WorkerDatabaseBinding, type PrismaClient } from '@salora/database';
import { env } from '$env/dynamic/private';

// Define the shape of our expected environment variables injected by Vite
interface ImportMetaEnv {
	IS_WORKER: boolean;
}

const isWorker = (import.meta.env as unknown as ImportMetaEnv).IS_WORKER;

let prismaInstance: PrismaClient | null = null;

export const initializeWorkerPrisma = (database?: WorkerDatabaseBinding) => {
	if (prismaInstance) return;

	// Only initialize if we are in a worker environment and have the database binding
	if (isWorker && database) {
		// In the worker build, createClient is aliased to createWorkerClient
		// which accepts the database binding object.
		// We cast to any to suppress TS errors since the IDE sees the Node definition.
		prismaInstance = (createClient as any)(database);
	}
};

// Verify/Initialize for Node environment
if (!isWorker) {
	// In the Node build, createClient is the standard Prisma constructor wrapper
	// which accepts a connection string.
	if (env?.DATABASE_URL) {
		prismaInstance = (createClient as any)(env.DATABASE_URL);
	}
}

export const prisma = new Proxy({} as PrismaClient, {
	get(_target: any, prop: PropertyKey, receiver: any) {
		if (!prismaInstance) {
			throw new Error(
				isWorker 
					? 'Prisma Client not initialized. Worker database binding missing.' 
					: 'Prisma Client not initialized. DATABASE_URL environment variable missing.'
			);
		}
		const value = Reflect.get(prismaInstance as any, prop, receiver);

		if (typeof value === 'function') {
			return (value as Function).bind(prismaInstance);
		}

		return value;
	}
}) as any as PrismaClient;

// Helper functions (formerly duplicated in prisma-node.ts and prisma-worker.ts)

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
