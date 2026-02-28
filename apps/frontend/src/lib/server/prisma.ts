import { createClient } from '@salora/database';
import { DATABASE_URL } from '$env/static/private';

export const prisma = createClient(DATABASE_URL);

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
			return;
		}
		return {
			...communication,
			enabled: communication.enabled,
			type: communication.type,
			smtpPort: communication.settings.smtpPort as number,
			smtpServer: communication.settings.smtpServer as string,
			smtpUsername: communication.settings.smtpUsername as string,
			smtpPassword: communication.settings.smtpPassword as string,
			smsProvider: communication.settings.smsProvider as string,
			smsApiKey: communication.settings.smsApiKey as string,
			smtpEmail: communication.settings.smtpEmail as string
		};
	});
}
