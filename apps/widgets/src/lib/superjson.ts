import superjson from 'superjson';
import { DateTime, Interval } from 'luxon';

superjson.registerCustom<DateTime, string>(
	{
		isApplicable: (v): v is DateTime => DateTime.isDateTime(v),
		serialize: (v) => v.toISO() ?? '', // serialize to ISO string, fallback to empty string if null
		deserialize: (v) => DateTime.fromISO(v), // deserialize back to DateTime
	},
	'luxon-date'
);

superjson.registerCustom<Interval, { start: string; end: string }>(
	{
		isApplicable: (v): v is Interval => Interval.isInterval(v),
		serialize: (v) => ({
			start: v.start?.toISO() ?? '',
			end: v.end?.toISO() ?? '',
		}),
		deserialize: (v) =>
			Interval.fromDateTimes(DateTime.fromISO(v.start), DateTime.fromISO(v.end)),
	},
	'luxon-interval'
);

export default superjson;
