import mysql from 'mysql2/promise';
import { env } from './env';

interface AmeliaCustomer {
	id: string | number;
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	gender?: string;
	note?: string;
}

interface AmeliaService {
	id: string | number;
	name: string;
	price: number;
	duration: number;
}

interface AmeliaAppointment {
	appointmentId: string | number;
	bookingStart: Date;
	bookingEnd: Date;
	created: Date;
	serviceId: string | number;
	customerId: string | number;
	status: string;
	internalNotes?: string;
}

interface AmeliaData {
	customers: AmeliaCustomer[];
	services: AmeliaService[];
	appointments: AmeliaAppointment[];
}

/**
 * Fetches Amelia data from MySQL database
 * Expects the Amelia database to be accessible via DATABASE_URL environment variable
 */
export async function getAmeliaDataFromMySQL(): Promise<AmeliaData> {
	let connection;

	try {

		// Parse the DATABASE_URL to get connection config
		const config = {
			host: '116.202.134.139',
			user: 'babylon1',
			password: 'C42!g38evNhO:E',
			database: 'babylon1_migrate', // of je test DB
			port: 3306
		};

		// Create MySQL connection
		connection = await mysql.createConnection(config);
		console.log('Connected to database. Fetching Amelia data...');

		// 1. Fetch all customers
		const [customersResult] = (await connection.execute(`
			SELECT id, firstName, lastName, email, phone, gender, note 
			FROM eouz_amelia_users 
			WHERE type = 'customer'
		`)) as any;

		const customers = Array.isArray(customersResult) ? customersResult : [];

		// 2. Fetch all services
		const [servicesResult] = (await connection.execute(`
			SELECT id, name, price, duration 
			FROM eouz_amelia_services
		`)) as any;

		const services = Array.isArray(servicesResult) ? servicesResult : [];

		// 3. Fetch appointments with customer bookings
		const [appointmentsResult] = (await connection.execute(`
			SELECT a.id as appointmentId, a.bookingStart, a.bookingEnd, cb.created, a.serviceId, cb.customerId, cb.status, a.internalNotes
			FROM eouz_amelia_appointments a
			JOIN eouz_amelia_customer_bookings cb ON a.id = cb.appointmentId
		`)) as any;

		const appointments = Array.isArray(appointmentsResult) ? appointmentsResult : [];

		const ameliaData: AmeliaData = {
			customers,
			services,
			appointments
		};

		console.log(`Fetched ${ameliaData.customers.length} customers, ${ameliaData.services.length} services, ${ameliaData.appointments.length} appointments`);

		return ameliaData;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to fetch Amelia data from MySQL: ${message}`);
	} finally {
		if (connection) {
			await connection.end();
		}
	}
}
