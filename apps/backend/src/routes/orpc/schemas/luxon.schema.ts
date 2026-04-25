import { DateTime, Interval } from "luxon";
import { z } from "zod";

const luxonDateInput = z.union([
	z.custom<DateTime>((value) => DateTime.isDateTime(value), {
		message: "Invalid Luxon DateTime",
	}),
	z.string(),
]);

export const luxonDate = luxonDateInput.transform((value, ctx) => {
	if (DateTime.isDateTime(value)) return value;

	const parsedDate = DateTime.fromISO(value);
	if (parsedDate.isValid) return parsedDate;

	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message: "Invalid Luxon DateTime",
	});
	return z.NEVER;
});

const luxonIntervalInput = z.union([
	z.custom<Interval>((value) => Interval.isInterval(value), {
		message: "Invalid Luxon Interval",
	}),
	z.string(),
	z.object({
		start: luxonDateInput,
		end: luxonDateInput,
	}),
]);

export const luxonInterval = luxonIntervalInput.transform((value, ctx) => {
	if (Interval.isInterval(value)) return value;

	if (typeof value === "string") {
		const parsedInterval = Interval.fromISO(value);
		if (parsedInterval.isValid) return parsedInterval;
	}

	if (typeof value === "object" && value !== null && "start" in value && "end" in value) {
		const startValue = (value as { start: DateTime }).start;
		const endValue = (value as { end: DateTime }).end;

		const parsedInterval = Interval.fromDateTimes(startValue, endValue);
		if (parsedInterval.isValid) return parsedInterval;
	}

	ctx.addIssue({
		code: 'custom',
		message: "Invalid Luxon Interval",
	});
	return z.NEVER;
});
