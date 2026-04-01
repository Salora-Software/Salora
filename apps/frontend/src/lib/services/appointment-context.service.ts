import { AvailabilityEngine } from '@salora/scheduler';
import type { DatabaseType } from '@salora/database';
import { fetchBookingData } from '$lib/services/availability.service';
import type { Interval } from 'luxon';

export const getTimeZoneOrDefault = (timeZone?: string | null) => timeZone || 'UTC';

export const createAvailabilityEngine = (
	slotDurationMinutes: number,
	autoShiftTimeSlot?: boolean | null
) => {
	return new AvailabilityEngine().useDefaultPipeline().withConfig({
		slotDurationMinutes,
		bufferMinutes: 0,
		gridStrategy: autoShiftTimeSlot ? 'flexible' : 'fixed'
	});
};

export const createAppointmentContext = async (
	db: DatabaseType,
	branchId: string,
	serviceId: string,
	searchSpan: Interval
) => {
	const { organization, service, employees } = await fetchBookingData(
		db,
		branchId,
		serviceId,
		searchSpan
	);

	return {
		organization,
		service,
		employees,
		timeZone: getTimeZoneOrDefault(organization.timeZone),
		engine: createAvailabilityEngine(service.duration, organization.autoShiftTimeSlot)
	};
};