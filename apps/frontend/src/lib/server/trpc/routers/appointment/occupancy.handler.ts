import { TRPCError } from '@trpc/server';
import { Interval, DateTime, type WeekdayNumbers } from 'luxon';
import { IntervalUtils } from '@salora/scheduler';
import { fetchBookingData, getIntervalsForDate } from '$lib/services/availability.service';
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

	const initialStart = range.start.setZone('UTC', { keepLocalTime: true }).startOf('day');
	const initialEnd = range.end.setZone('UTC', { keepLocalTime: true }).endOf('day');
	const fullSearchSpan = Interval.fromDateTimes(initialStart, initialEnd);

	// Zorg dat fetchBookingData de relations `calendarItems` meelaadt voor de members
	const { organization, employees } = await fetchBookingData(
		db,
		branchId,
		serviceId,
		fullSearchSpan
	);

	const timeZone = organization.timeZone || 'UTC';
	const start = range.start.setZone(timeZone, { keepLocalTime: true }).startOf('day');
	const end = range.end.setZone(timeZone, { keepLocalTime: true }).endOf('day');

	// 1. Groepeer geboekte minuten per datum op basis van calendarItems
	const bookedMinutesPerDate = new Map<string, number>();

	for (const employee of employees) {
		// Fallback naar een lege array als er geen kalenderitems zijn geladen
		const items = employee.member.calendarItems || [];

		for (const item of items) {
			// Tel alleen daadwerkelijke boekingen mee voor de bezettingsgraad
			if (item.type !== 'BOOKING') continue;

			const startMs = item.startTime.getTime();
			const endMs = item.endTime.getTime();
			const durationMinutes = (endMs - startMs) / 60000;

			const dateStr = DateTime.fromJSDate(item.startTime).setZone(timeZone).toISODate()!;

			bookedMinutesPerDate.set(dateStr, (bookedMinutesPerDate.get(dateStr) || 0) + durationMinutes);
		}
	}

	// 2. Cache werkcapaciteit per weekdag
	const capacityPerWeekday = new Map<number, number>();
	for (let i = 1; i <= 7; i++) {
		const refDay = start.set({ weekday: i as WeekdayNumbers });
		const orgIntervals = getIntervalsForDate(organization.openingTimes, refDay, timeZone);

		let weekdayMinutes = 0;
		for (const employee of employees) {
			const empIntervals = getIntervalsForDate(employee.member.availabilities, refDay, timeZone);
			const workingIntervals = IntervalUtils.intersect(orgIntervals, empIntervals);

			for (const interval of workingIntervals) {
				weekdayMinutes += (interval.end!.toMillis() - interval.start!.toMillis()) / 60000;
			}
		}
		capacityPerWeekday.set(i, weekdayMinutes);
	}

	// 3. Bouw de output
	const daysResult = [];
	let currentDay = start;

	while (currentDay < end) {
		const dayString = currentDay.toISODate()!;
		const weekday = currentDay.weekday;

		const totalWorkingMinutes = capacityPerWeekday.get(weekday) || 0;
		const totalBookedMinutes = bookedMinutesPerDate.get(dayString) || 0;

		let occupancyPercentage = 0;
		if (totalWorkingMinutes > 0) {
			occupancyPercentage = Math.round((totalBookedMinutes / totalWorkingMinutes) * 100);
			occupancyPercentage = Math.min(occupancyPercentage, 100);
		}

		daysResult.push({
			date: dayString,
			occupancyPercentage,
			available: occupancyPercentage < 100 && totalWorkingMinutes > 0
		});

		currentDay = currentDay.plus({ days: 1 });
	}

	return { days: daysResult };
};
