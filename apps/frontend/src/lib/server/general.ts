import { TRPCError } from '@trpc/server';
import { db } from '@salora/database';
import { DateTime, Duration, Interval } from 'luxon';

export type Branch = Awaited<ReturnType<typeof getOrganization>>;

// Returns the availability intervals for a single employee within the allowed booking window
export function getEmployeeAvailabilityV2(
	branch: Branch,
	employeeId: string,
	intervalRange: Interval,
	includeBooked: boolean = true
) {
	if (!intervalRange.start || !intervalRange.end) {
		return [];
	}

	// Find the employee (member) object
	const member = branch.members.find((m) => m.id === employeeId);
	if (!member) {
		return [];
	}

	// Build employee availability intervals for the requested intervalRange
	const employeeAvailabilities: Interval[] = [];
	let current = intervalRange.start.startOf('day');
	while (current <= intervalRange.end) {
		const weekday = current.weekday; // 1 = Monday, 7 = Sunday
		const availabilities = member.availabilities.filter((a) => a.dayOfWeek === weekday);
		for (const avail of availabilities) {
			const refStart = DateTime.fromJSDate(new Date(avail.startTimeUtc), { zone: branch.timeZone });
			const refEnd = DateTime.fromJSDate(new Date(avail.endTimeUtc), { zone: branch.timeZone });
			const start = current.setZone(branch.timeZone).set({
				hour: refStart.hour,
				minute: refStart.minute,
				second: 0,
				millisecond: 0
			});
			const end = current.setZone(branch.timeZone).set({
				hour: refEnd.hour,
				minute: refEnd.minute,
				second: 0,
				millisecond: 0
			});
			if (end > start) {
				employeeAvailabilities.push(Interval.fromDateTimes(start, end));
			}
		}
		current = current.plus({ days: 1 });
	}

	// Intersect employee availability with org opening times
	const openingTimes = getOpeningTimesV2(branch, intervalRange);
	const allowedIntervals: Interval[] = [];
	for (const avail of employeeAvailabilities) {
		for (const open of openingTimes) {
			const intersection = avail.intersection(open);
			if (
				intersection &&
				intersection.isValid &&
				intersection.start &&
				intersection.end &&
				intersection.start < intersection.end
			) {
				allowedIntervals.push(intersection);
			}
		}
	}

	if (!includeBooked) {
		return allowedIntervals;
	}
	// Subtract bookings only (no out-of-bounds intervals)
	const bookings = getBookingsForEmployeeV2(branch, employeeId, intervalRange);
	const busyIntervals = bookings;
	const available = subtractIntervals(allowedIntervals, busyIntervals).filter(
		(interval) => interval.start !== null && interval.end !== null
	);
	return available;
}

export function generateTimeSlotsForEmployeesV2(
	branch: Branch,
	service: { duration: number },
	employeeIds: string[],
	intervalRange: Interval
) {
	// Enforce minimumBookingTime and bookingPeriod
	const minimumBookingTime = branch.minimumBookingTime; // hours
	const bookingPeriod = branch.bookingPeriod; // days
	const now = DateTime.now().setZone(branch.timeZone);
	const minAllowed = now.plus({ hours: minimumBookingTime });
	const maxAllowed = now.plus({ days: bookingPeriod });

	// If the requested interval is completely out of bounds, return empty
	if (
		!intervalRange.start ||
		!intervalRange.end ||
		intervalRange.end < minAllowed ||
		intervalRange.start > maxAllowed
	) {
		return { openingTimes: [], openingTimesTimeSlots: [], availabilityMap: {} };
	}

	// Clamp the interval to allowed range
	const clampedStart = intervalRange.start < minAllowed ? minAllowed : intervalRange.start;
	const clampedEnd = intervalRange.end > maxAllowed ? maxAllowed : intervalRange.end;
	const clampedInterval = Interval.fromDateTimes(clampedStart, clampedEnd);

	const openingTimes = getOpeningTimesV2(branch, clampedInterval);
	const openingTimesTimeSlots = openingTimes.flatMap((time) =>
		time.splitBy(Duration.fromObject({ minutes: service.duration })).filter((slot) => {
			// Only include slots with exact duration and within allowed range
			if (slot.start === null || slot.end === null) return false;
			const duration = slot.end.diff(slot.start, 'minutes').minutes;
			return duration === service.duration && slot.start >= minAllowed && slot.end <= maxAllowed;
		})
	);
	const availabilityMap: Record<string, Interval[]> = {};
	for (const empId of employeeIds) {
		// Use getEmployeeAvailabilityV2 for each employee
		const available = getEmployeeAvailabilityV2(branch, empId, clampedInterval);
		availabilityMap[empId] = available;
	}
	return { openingTimes, openingTimesTimeSlots, availabilityMap };
}
export async function getOrganization(id: string) {
	const organization = await db.query.organization.findFirst({
		where: (table, { eq }) => eq(table.id, id),
		with: {
			services: true,
			openingTimes: true,
			members: {
				with: {
					organization: true,
					availabilities: true,
					employeeServices: true,
					calendarItems: true,
					user: true
				}
			}
		}
	});

	if (!organization) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'branch_not_found'
		});
	}
	return organization;
}
export function getEmployees(branch: Branch, employeeIds: string[] = []) {
	const employees = branch.members.filter((member) => {
		if (employeeIds.length === 0) return true;
		return employeeIds.includes(member.id);
	});
	if (!employees) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'employees_not_found'
		});
	}
	return employees;
}
export function getOpeningTimes(branch: Branch) {
	const openingTimes = branch.openingTimes;
	if (!openingTimes) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'opening_times_not_found'
		});
	}
	return openingTimes;
}
export function getBookingsForEmployee(
	branch: Branch,
	employeeId: string,
	dateStart?: DateTime,
	dateEnd?: DateTime
): Interval[] {
	return branch.members.flatMap((employee) => {
		if (employee.id === employeeId) {
			return employee.calendarItems
				.map((item) => {
					const start = DateTime.fromJSDate(new Date(item.startTime), {
						zone: branch.timeZone
					});
					const end = DateTime.fromJSDate(new Date(item.endTime), {
						zone: branch.timeZone
					});
					if (dateStart && dateEnd) {
						if (start < dateStart || end > dateEnd) {
							return null;
						}
					}
					return Interval.fromDateTimes(start, end);
				})
				.filter((interval): interval is Interval => interval !== null);
		}
		return [];
	});
}
export function subtractIntervals(source: Interval[], toRemove: Interval[]): Interval[] {
	let result = [...source];

	for (const remove of toRemove) {
		const newResult: Interval[] = [];
		for (const sourceInterval of result) {
			if (sourceInterval.overlaps(remove)) {
				const diff = sourceInterval.difference(remove);
				newResult.push(...diff);
			} else {
				newResult.push(sourceInterval);
			}
		}
		result = newResult;
	}

	return result;
}
export function getBookingsForEmployeeV2(
	branch: Branch,
	employeeId: string,
	range: Interval
): Interval[] {
	return branch.members.flatMap((employee) => {
		if (employee.id === employeeId) {
			return employee.calendarItems
				.map((item) => {
					const start = DateTime.fromJSDate(new Date(item.startTime), {
						zone: branch.timeZone
					});
					const end = DateTime.fromJSDate(new Date(item.endTime), {
						zone: branch.timeZone
					});
					const bookingInterval = Interval.fromDateTimes(start, end);
					const intersection = bookingInterval.intersection(range);
					return intersection;
				})
				.filter((interval): interval is Interval => interval !== null);
		}
		return [];
	});
}
export function getService(branch: Branch, serviceId: string) {
	const service = branch.services.find((service) => service.id === serviceId);
	if (!service) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'service_not_found'
		});
	}
	return service;
}
export function alignToBranchOpeningHours(branch: Branch, interval: Interval) {
	const weekday = interval.start?.weekday;
	const dateNow = DateTime.now().setZone(branch.timeZone);

	if (interval.start && interval.end) {
		const startDate = interval.start;
		const endDate = interval.end;
		const bookingPeriod = branch.bookingPeriod;
		if (Math.ceil(endDate.diff(dateNow, 'days').days) > bookingPeriod) {
			return null;
		}
	}
	const rawMinDate = dateNow.plus({ hours: branch.minimumBookingTime });
	const remainder = rawMinDate.minute % 5;
	const minDate = rawMinDate
		.plus({ minutes: remainder === 0 ? 0 : 5 - remainder })
		.set({ second: 0, millisecond: 0 });
	//return [] as Interval[]; if minDate is both interval.start and interval.end are before minDate
	if (interval.end && interval.end < minDate && interval.start && interval.start < minDate) {
		return [];
	}
	if (interval.start && interval.start < minDate) {
		interval = interval.set({ start: minDate });
	}
	if (interval.start && interval.end && interval.start > interval.end) {
		interval = interval.set({ start: interval.end });
	}
	if (!weekday) return null;
	const openingTimes = getOpeningTimes(branch)
		.filter((time) => time.dayOfWeek === weekday)
		.map((time) => {
			return Interval.fromDateTimes(
				DateTime.fromJSDate(new Date(time.startTimeUtc), { zone: branch.timeZone }).set({
					year: interval.start?.year,
					month: interval.start?.month,
					day: interval.start?.day
				}),
				DateTime.fromJSDate(new Date(time.endTimeUtc), { zone: branch.timeZone }).set({
					year: interval.end?.year,
					month: interval.end?.month,
					day: interval.end?.day
				})
			);
		});
	let finalInterval: Interval[] = [];
	for (const time of openingTimes) {
		const intersection = interval.intersection(time);
		finalInterval = [...finalInterval, intersection].filter(
			(interval): interval is Interval => interval !== null
		);
	}

	return finalInterval;
}

export function generateAvailableTimeslots(
	allowedIntervals: Interval[],
	blockedIntervals: Interval[],
	durationMinutes: number,
	autoShift: boolean = false
): Interval[] {
	// Step 1: Remove blocked intervals from allowed intervals
	let available: Interval[] = allowedIntervals;
	for (const block of blockedIntervals) {
		available = available.flatMap((slot) => {
			let newBlock = block;
			if (!autoShift) {
				// TODO: Implement autoShift logic so it doesnt autoshift by default
			}
			const overlaps = slot.overlaps(newBlock);

			return overlaps ? slot.difference(newBlock) : [slot];
		});
	}

	// Step 2: Chunk into timeslots
	const slots: Interval[] = [];

	for (const interval of available) {
		let cursor = interval.start;
		if (!interval.start || !interval.end || !cursor || cursor >= interval.end) break;
		while (cursor.plus({ minutes: durationMinutes }) <= interval.end) {
			const end = cursor.plus({ minutes: durationMinutes });
			slots.push(Interval.fromDateTimes(cursor, end));
			cursor = cursor.plus({ minutes: durationMinutes });
		}
	}

	return slots;
}
export async function generateEmployeesTimeSlots(
	branch: string | Branch,
	serviceId: string,
	employeeIds: string[],
	date: Interval
) {
	if (typeof branch === 'string') branch = await getOrganization(branch);
	const service = getService(branch, serviceId);
	const employees = getEmployees(branch, employeeIds).filter(
		(employee) =>
			employee.availabilities.length > 0 ||
			employee.employeeServices.some((s) => s.serviceId === serviceId)
	);
	if (!date.start || !date.end)
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'invalid_date_range' });
	const startWeekday = date.start.weekday;
	const blockedIntervals = employees.flatMap((employee) => {
		if (!date.start || !date.end) return [];
		return getBookingsForEmployee(branch as Branch, employee.id, date.start, date.end);
	});
	//TODO: Fix having to loop instead of putting it in the interval timespan
	const allowedIntervals: Interval[] = employees
		.flatMap((employee) => {
			const allowed = employee.availabilities.map((availability) => {
				const start = DateTime.fromJSDate(new Date(availability.startTimeUtc), {
					zone: (branch as Branch).timeZone
				}).plus({ days: 1 });
				const end = DateTime.fromJSDate(new Date(availability.endTimeUtc), {
					zone: (branch as Branch).timeZone
				}).plus({ days: 1 });
				if (availability.dayOfWeek === startWeekday) {
					const availabilityInterval = Interval.fromDateTimes(
						start.set({ year: date.start?.year, month: date.start?.month, day: date.start?.day }),
						end.set({ year: date.end?.year, month: date.end?.month, day: date.end?.day })
					);
					const allowedInterval = availabilityInterval.intersection(date);
					return allowedInterval;
				}
				return null;
			});
			return allowed;
		})
		.filter((interval): interval is Interval => interval !== null);
	const alignedIntervals = allowedIntervals
		.flatMap((interval) => alignToBranchOpeningHours(branch as Branch, interval))
		.filter((interval): interval is Interval => interval !== null);

	const timeSlots = generateAvailableTimeslots(
		alignedIntervals,
		blockedIntervals,
		service.duration
	);

	return timeSlots;
}

export function getOpeningTimesV2(branch: Branch, range: Interval): Interval[] {
	const openingTimes = branch.openingTimes;
	const timeZone = branch.timeZone ?? 'UTC';

	if (!openingTimes) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'opening_times_not_found'
		});
	}
	if (!range.start || !range.end) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'invalid_date_range'
		});
	}

	const rawIntervals: Interval[] = [];
	let current = range.start.startOf('day');

	while (current <= range.end) {
		const weekday = current.weekday; // 1 = Monday, 7 = Sunday
		const openings = openingTimes.filter((o) => o.dayOfWeek === weekday);

		for (const opening of openings) {
			const refStart = DateTime.fromJSDate(new Date(opening.startTimeUtc), { zone: timeZone });
			const refEnd = DateTime.fromJSDate(new Date(opening.endTimeUtc), { zone: timeZone });

			const start = current.setZone(timeZone).set({
				hour: refStart.hour,
				minute: refStart.minute,
				second: 0,
				millisecond: 0
			});

			const end = current.setZone(timeZone).set({
				hour: refEnd.hour,
				minute: refEnd.minute,
				second: 0,
				millisecond: 0
			});

			if (end > start) {
				rawIntervals.push(Interval.fromDateTimes(start, end));
			}
		}

		current = current.plus({ days: 1 });
	}

	// --- MERGE overlapping or adjacent intervals ---
	// remove the empty rawIntervals[].start and rawIntervals[].end intervals
	const sorted = rawIntervals.sort((a, b) => {
		const aMillis = a.start ? a.start.toMillis() : 0;
		const bMillis = b.start ? b.start.toMillis() : 0;
		return aMillis - bMillis;
	});
	const merged: Interval[] = [];

	for (const interval of sorted) {
		const last = merged.at(-1);
		if (!last) {
			merged.push(interval);
		} else if (last.overlaps(interval) || last.engulfs(interval) || last.abutsStart(interval)) {
			if (last.start && last.end && interval.end) {
				const newInterval = Interval.fromDateTimes(
					last.start,
					last.end > interval.end ? last.end : interval.end
				);
				merged[merged.length - 1] = newInterval;
			} else {
				// If either start or end is null, skip merging and push the interval
				merged.push(interval);
			}
		} else {
			merged.push(interval);
		}
	}

	return merged;
}

export function transformTimeSlots(EmployeeTimeSlots: Interval[]) {
	let groupedByDate: Record<
		string,
		{
			date: { year: number; month: number; day: number };
			percentageBooked: number;
			timeSlots: { from: string; to: string; serviceId: string }[];
			availableSlots: string[];
		}
	> = {};
	//loop through EmployeeTimeSlots
	for (const slot of EmployeeTimeSlots) {
		const date = slot.start?.toFormat('yyyy-MM-dd');
		if (!date) continue;
		const [year, month, day] = date.split('-').map((d) => parseInt(d));
		if (!groupedByDate[date]) {
			groupedByDate[date] = {
				date: { year, month, day },
				percentageBooked: 0,
				timeSlots: [],
				availableSlots: []
			};
		}
		groupedByDate[date].timeSlots.push({
			from: slot.start?.toFormat('HH:mm') || '',
			to: slot.end?.toFormat('HH:mm') || '',
			serviceId: ''
		});
		//aksi add it to available slots
		groupedByDate[date].availableSlots.push(`${slot.start?.toFormat('HH:mm')}`);
	}
	// generate the percentage booked
	for (const date in groupedByDate) {
		const slots = groupedByDate[date].timeSlots;
		const totalSlots = slots.length;
		const bookedSlots = slots.filter((slot) => slot.serviceId !== '').length;
		groupedByDate[date].percentageBooked = (bookedSlots / totalSlots) * 100;
	}

	return Object.values(groupedByDate);
}

export function getDateTimeInTimeZone(date: Date, timeZone: string) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone
	});

	const parts = formatter.formatToParts(date);
	const result: any = {};

	for (const part of parts) {
		if (part.type !== 'literal') {
			result[part.type] = part.value;
		}
	}

	return {
		year: parseInt(result.year),
		month: parseInt(result.month),
		day: parseInt(result.day),
		hour: parseInt(result.hour),
		minute: parseInt(result.minute),
		dayOfWeek: date.getDay() + 1
	};
}

//make a compare function with date1Start, date1End and date2Start, date2End as datetime and should return true if it overlaps
export function compareDateTime(
	date1Start: Date,
	date1End: Date,
	date2Start: Date,
	date2End: Date
) {
	return date1Start <= date2End || date1End >= date2Start;
}
