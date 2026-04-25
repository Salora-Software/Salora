import { DateTime, Interval } from 'luxon';
import { z } from 'zod';

export const luxonDate = z.preprocess(
	(arg) => {
		if (DateTime.isDateTime(arg)) return arg;
		if (typeof arg === 'string') {
			const parsedDate = DateTime.fromISO(arg);
			if (parsedDate.isValid) return parsedDate;
		}
		return arg;
	},
	z.custom<DateTime>((val) => DateTime.isDateTime(val), {
		message: 'Invalid Luxon DateTime',
	}),
);

export const luxonInterval = z.preprocess(
	(arg) => {
		if (Interval.isInterval(arg)) return arg;

		if (typeof arg === 'string') {
			const parsedInterval = Interval.fromISO(arg);
			if (parsedInterval.isValid) return parsedInterval;
		}

		if (typeof arg === 'object' && arg !== null && 'start' in arg && 'end' in arg) {
			const startValue = (arg as { start: unknown }).start;
			const endValue = (arg as { end: unknown }).end;

			const start = DateTime.isDateTime(startValue)
				? startValue
				: DateTime.fromISO(String(startValue));
			const end = DateTime.isDateTime(endValue)
				? endValue
				: DateTime.fromISO(String(endValue));

			if (start.isValid && end.isValid) {
				return Interval.fromDateTimes(start, end);
			}
		}

		return arg;
	},
	z.custom<Interval>((val) => Interval.isInterval(val), {
		message: 'Invalid Luxon Interval',
	}),
);