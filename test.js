import mysql from 'mysql2/promise';
import fs from 'fs';

const CONFIG = {
	host: '116.202.134.139',
	user: 'babylon1',
	password: 'C42!g38evNhO:E',
	database: 'babylon1_migrate', // of je test DB
	port: 3306
};

async function exportAmeliaToJson() {
	const connection = await mysql.createConnection(CONFIG);
	console.log('Verbonden. Data ophalen...');

	// 1. Haal alle klanten op
	const [customers] = await connection.execute(`
    SELECT id, firstName, lastName, email, phone, gender, note 
    FROM eouz_amelia_users 
    WHERE type = 'customer'
  `);

	// 2. Haal alle diensten op
	const [services] = await connection.execute(`
    SELECT id, name, price, duration 
    FROM eouz_amelia_services
  `);

	// 3. Haal de afspraken en de gekoppelde klant-ID's op
	const [appointments] = await connection.execute(`
    SELECT a.id as appointmentId, a.bookingStart, a.serviceId, cb.customerId, cb.status, a.internalNotes
    FROM eouz_amelia_appointments a
    JOIN eouz_amelia_customer_bookings cb ON a.id = cb.appointmentId
  `);

	// Bundel alles in één object
	const exportData = {
		customers,
		services,
		appointments
	};

	// Schrijf naar een JSON bestand
	fs.writeFileSync('amelia_data.json', JSON.stringify(exportData, null, 2));
	console.log('Klaar! Opgeslagen als amelia_data.json');

	await connection.end();
}

exportAmeliaToJson().catch(console.error);