import { DateTime, Interval } from 'luxon';

export const orpcCustomJsonSerializers = [
	{
		type: 1001,
		condition: (data: unknown) => DateTime.isDateTime(data),
		serialize: (data: DateTime) => data.toISO() ?? '',
		deserialize: (serialized: string) => DateTime.fromISO(serialized),
	},
	{
		type: 1002,
		condition: (data: unknown) => Interval.isInterval(data),
		serialize: (data: Interval) => ({
			start: data.start?.toISO() ?? '',
			end: data.end?.toISO() ?? '',
		}),
		deserialize: (serialized: { start: string; end: string }) =>
			Interval.fromDateTimes(DateTime.fromISO(serialized.start), DateTime.fromISO(serialized.end)),
	},
] as const;