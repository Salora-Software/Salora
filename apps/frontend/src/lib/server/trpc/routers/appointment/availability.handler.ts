import { aggregateAvailability } from '@salora/scheduler';
import { getDaySpanForDateTime, getIntervalsForDate } from '@salora/availability';
import { calculateEmployeeSlots } from '$lib/services/availability.service';
import {
	createAppointmentContext,
	getBookingCutoffDateTime
} from '$lib/services/appointment-context.service';
import type { GetAvailabilityInput } from './availability.schema';
import type { PortalContext } from '../../context';

type getAvailabilityOpts = {
	ctx: PortalContext;
	input: GetAvailabilityInput;
};
// ... (imports blijven hetzelfde)

export const getAvailabilityHandler = async ({
	input: { branchId, serviceId, date },
	ctx: { db }
}: getAvailabilityOpts) => {
	const initialSpan = getDaySpanForDateTime(date);

	const { organization, service, employees, timeZone, engine } = await createAppointmentContext(
		db,
		branchId,
		serviceId,
		initialSpan.utcSpan
	);

	const localSpan = getDaySpanForDateTime(date, timeZone);
	const targetDate = localSpan.localStart;
	const searchSpan = localSpan.localSpan;
	const bookingCutoff = getBookingCutoffDateTime(timeZone, organization.minimumBookingTime);

	const orgIntervals = getIntervalsForDate(organization.openingTimes, targetDate, timeZone);

	const employeeResults = calculateEmployeeSlots(
		employees,
		engine,
		searchSpan,
		orgIntervals,
		targetDate,
		timeZone
	);

	// fullTimeline bevat nu slots met variabele starttijden (bijv. 10:00, 10:30, maar ook 10:10)
	const fullTimeline = aggregateAvailability(employeeResults);

	// Oplossing voor het "Grijs maken" probleem:
	// We sturen de beschikbare slots (shifted) én we kunnen eventueel de boekingen meesturen.
	// Voor de simpele 'slots' array mapping:
	const slots = fullTimeline.map((aggregated) => {
		const interval = aggregated.interval;
		const startsAfterCutoff = interval.start ? interval.start >= bookingCutoff : false;
		const availableCapacity = startsAfterCutoff ? aggregated.availableCapacity : 0;
		return {
			interval,
			availableCapacity,
			available: availableCapacity > 0,
			availableEmployees: aggregated.availableEmployees
		};
	});

	// Optioneel: Als je de 'bezet' blokken ook in je JSON wilt voor de frontend
	// kun je alle 'member.calendarItems' samenvoegen en meegeven als 'blocked'
	const allBookings = employees.flatMap((e) => e.member.calendarItems);

	return {
		date: targetDate.toISODate(),
		slots,
		blocked: allBookings.map((b) => ({
			start: b.startTime,
			end: b.endTime,
			type: b.type
		}))
	};
};
