import { TRPCError } from '@trpc/server';
import { Interval } from 'luxon';
import { AvailabilityEngine, IntervalUtils } from '@salora/scheduler';
import {
	fetchBookingData,
	calculateEmployeeSlots,
	getIntervalsForDate
} from '$lib/services/availability.service';
import type { GetOccupancyInput } from './occupancy.schema'; // Vervang met jouw daadwerkelijke schema
import type { PrivateContext } from '../../context';

type GetOccupancyOpts = {
	ctx: PrivateContext;
	input: GetOccupancyInput;
};

export const getOccupancyHandler = async ({ input, ctx: { db } }: GetOccupancyOpts) => {
	const { branchId, serviceId, range } = input;

	if (!range.isValid || !range.start || !range.end) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ongeldig bereik' });
	}

	// 1. Data ophalen voor de volledige periode in één query
	const initialStart = range.start.setZone('UTC', { keepLocalTime: true }).startOf('day');
	const initialEnd = range.end.setZone('UTC', { keepLocalTime: true }).endOf('day');
	const fullSearchSpan = Interval.fromDateTimes(initialStart, initialEnd);

	const { organization, service, employees } = await fetchBookingData(
		db,
		branchId,
		serviceId,
		fullSearchSpan
	);

	const timeZone = organization.timeZone || 'UTC';
	const start = range.start.setZone(timeZone, { keepLocalTime: true }).startOf('day');
	const end = range.end.setZone(timeZone, { keepLocalTime: true }).endOf('day');

	// 2. Engine eenmalig initialiseren
	const engine = new AvailabilityEngine().useDefaultPipeline().withConfig({
		slotDurationMinutes: service.duration,
		bufferMinutes: 0,
		gridStrategy: organization.autoShiftTimeSlot ? 'flexible' : 'fixed'
	});

	const daysResult = [];
	let currentDay = start;

	// 3. Loop per dag en hergebruik de logica van de availability service
	while (currentDay < end) {
		const daySpan = Interval.fromDateTimes(currentDay, currentDay.endOf('day'));
		const dayString = currentDay.toISODate()!;

		const orgIntervals = getIntervalsForDate(organization.openingTimes, currentDay, timeZone);

		let totalDaySlots = 0;
		let availableDaySlots = 0;

		// Haal de beschikbare slots op voor deze specifieke dag
		const employeeResults = calculateEmployeeSlots(
			employees,
			engine,
			daySpan,
			orgIntervals,
			currentDay,
			timeZone
		);

		// Bereken theorethische capaciteit versus daadwerkelijk overgebleven slots
		for (let i = 0; i < employees.length; i++) {
			const member = employees[i].member;

			// Theorethisch maximum bepalen op basis van roosters en openingstijden
			const empIntervals = getIntervalsForDate(member.availabilities, currentDay, timeZone);
			const workingIntervals = IntervalUtils.intersect(orgIntervals, empIntervals);

			for (const interval of workingIntervals) {
				totalDaySlots += Math.floor(interval.length('minutes') / service.duration);
			}

			// Daadwerkelijke vrije gaten optellen uit de engine resultaten
			availableDaySlots += employeeResults[i].intervals.length;
		}

		const occupancyPercentage =
			totalDaySlots > 0
				? Math.round(((totalDaySlots - availableDaySlots) / totalDaySlots) * 100)
				: 0;

		daysResult.push({
			date: dayString,
			occupancyPercentage,
			available: availableDaySlots > 0
		});

		currentDay = currentDay.plus({ days: 1 });
	}

	return { days: daysResult };
};
