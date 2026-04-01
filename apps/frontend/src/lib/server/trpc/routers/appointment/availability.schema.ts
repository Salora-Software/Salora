import { z } from 'zod';
import { DateTime, Interval } from 'luxon';

export const luxonDate = z.preprocess(
	(arg) => {
		if (DateTime.isDateTime(arg)) return arg;
		if (typeof arg === 'string') {
			const dt = DateTime.fromISO(arg);
			if (dt.isValid) return dt;
		}
		return arg;
	},
	z.custom<DateTime>((val) => DateTime.isDateTime(val), { message: 'Ongeldige Luxon DateTime' })
);

export const luxonInterval = z.preprocess(
	(arg) => {
		if (Interval.isInterval(arg)) return arg;
		if (typeof arg === 'string') {
			const interval = Interval.fromISO(arg);
			if (interval.isValid) return interval;
		}
		if (typeof arg === 'object' && arg !== null && 'start' in arg && 'end' in arg) {
			const start = DateTime.isDateTime((arg as any).start)
				? (arg as any).start
				: DateTime.fromISO((arg as any).start as string);
			const end = DateTime.isDateTime((arg as any).end)
				? (arg as any).end
				: DateTime.fromISO((arg as any).end as string);
			if (start.isValid && end.isValid) return Interval.fromDateTimes(start, end);
		}
		return arg;
	},
	z.custom<Interval>((val) => Interval.isInterval(val), { message: 'Ongeldige Luxon Interval' })
);

export const getAvailabilitySchema = z.object({
	branchId: z.string(),
	serviceId: z.string(),
	date: luxonDate
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
