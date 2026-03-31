import { TRPCError } from '@trpc/server';
import { DateTime, Interval } from 'luxon';
import {
	AvailabilityEngine,
	aggregateAvailability,
	IntervalUtils,
	generateTimeGrid
} from '@salora/scheduler';
import {
	fetchBookingData,
	calculateEmployeeSlots,
	getIntervalsForDate
} from '$lib/services/availability.service';
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
	const initialTargetDate = date.setZone('UTC', { keepLocalTime: true });
	const initialSearchSpan = Interval.fromDateTimes(
		initialTargetDate.startOf('day'),
		initialTargetDate.endOf('day')
	);

	const { organization, service, employees } = await fetchBookingData(
		db,
		branchId,
		serviceId,
		initialSearchSpan
	);

	const timeZone = organization.timeZone || 'UTC';
	const targetDate = date.setZone(timeZone, { keepLocalTime: true });
	const searchSpan = Interval.fromDateTimes(targetDate.startOf('day'), targetDate.endOf('day'));

	const orgIntervals = getIntervalsForDate(organization.openingTimes, targetDate, timeZone);

	// De Engine gebruikt nu de juiste volgorde (Buffer -> Subtraction -> Chunking)
	// Zorg dat je SlotChunkingModule de 'shiftSlotsAfterBooking' check heeft die we eerder bespraken.
	const engine = new AvailabilityEngine().useDefaultPipeline().withConfig({
		slotDurationMinutes: service.duration,
		bufferMinutes: 0,
		gridStrategy: organization.autoShiftTimeSlot ? 'flexible' : 'fixed'
	});

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
		return {
			interval,
			availableCapacity: aggregated.availableCapacity,
			available: aggregated.availableCapacity > 0,
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
