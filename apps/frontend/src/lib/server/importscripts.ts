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
	try {
		// Vervang domein.nl door het daadwerkelijke domein van de remote server
		const response = await fetch(`https://hexidev.nl/amelia-export.php`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const ameliaData: AmeliaData = await response.json();

		console.log(
			`Fetched ${ameliaData.customers?.length || 0} customers, ${ameliaData.services?.length || 0} services, ${ameliaData.appointments?.length || 0} appointments`
		);

		return ameliaData;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to fetch Amelia data via API: ${message}`);
	}
}
