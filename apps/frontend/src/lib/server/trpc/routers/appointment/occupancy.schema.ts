import { z } from 'zod';
import { DateTime, Interval } from 'luxon';

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

export const getOccupancySchema = z.object({
	branchId: z.string(),
	serviceId: z.string(),
	range: luxonInterval
});

export type GetOccupancyInput = z.infer<typeof getOccupancySchema>;
