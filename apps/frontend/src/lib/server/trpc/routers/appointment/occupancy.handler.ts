import { TRPCError } from '@trpc/server';
import {
	getRangeSpanForInterval,
	buildBookedMinutesPerDate,
	buildCapacityPerWeekday,
	buildOccupancyDays
} from '@salora/availability';
import { createAppointmentContext } from '$lib/services/appointment-context.service';
import type { GetOccupancyInput } from './occupancy.schema';
import type { PortalContext } from '../../context';

type GetOccupancyOpts = {
	ctx: PortalContext;
	input: GetOccupancyInput;
};

export const getOccupancyHandler = async ({ input, ctx: { db } }: GetOccupancyOpts) => {
	const { branchId, serviceId, range } = input;

	if (!range.isValid || !range.start || !range.end) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ongeldig bereik' });
	}

	const utcRangeSpan = getRangeSpanForInterval(range);

	// Zorg dat fetchBookingData de relations `calendarItems` meelaadt voor de members
	const { organization, employees, timeZone } = await createAppointmentContext(
		db,
		branchId,
		serviceId,
		utcRangeSpan.utcSpan
	);

	const localRangeSpan = getRangeSpanForInterval(range, timeZone);
	const start = localRangeSpan.localStart;
	const end = localRangeSpan.localEnd;

	const bookedMinutesPerDate = buildBookedMinutesPerDate(employees, timeZone);
	const capacityPerWeekday = buildCapacityPerWeekday(
		organization.openingTimes,
		employees,
		start,
		timeZone
	);
	const daysResult = buildOccupancyDays(start, end, capacityPerWeekday, bookedMinutesPerDate);

	return { days: daysResult };
};
