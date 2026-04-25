import { base } from '../../bases/public';

import { getAvailabilityHandler } from './availability.handler';
import { getOccupancyHandler } from './occupancy.handler';
import { getAppointmentsHandler } from './appointments.handler';
import { createBookingHandler } from './booking.handler';
import { cancelAppointmentHandler } from './cancel.handler';

export const appointmentRouter = base.router({
	getAvailability: getAvailabilityHandler,
	getOccupancy: getOccupancyHandler,
	getAppointments: getAppointmentsHandler,
	createBooking: createBookingHandler,
	cancelAppointment: cancelAppointmentHandler,
});
