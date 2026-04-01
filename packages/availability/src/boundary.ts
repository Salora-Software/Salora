import { DateTime, Interval } from 'luxon';

const DEFAULT_ZONE = 'UTC';

export type DaySpan = {
	utcSpan: Interval;
	localSpan: Interval;
	localStart: DateTime;
	localEnd: DateTime;
};

const toUtcDaySpan = (date: DateTime): Interval => {
	const utcDate = date.setZone(DEFAULT_ZONE, { keepLocalTime: true });
	return Interval.fromDateTimes(utcDate.startOf('day'), utcDate.endOf('day'));
};

const toLocalDaySpan = (
	date: DateTime,
	timeZone: string
): { span: Interval; start: DateTime; end: DateTime } => {
	const localDate = date.setZone(timeZone, { keepLocalTime: true });
	const start = localDate.startOf('day');
	const end = localDate.endOf('day');

	return {
		span: Interval.fromDateTimes(start, end),
		start,
		end
	};
};

export const getDaySpanForDateTime = (date: DateTime, timeZone: string = DEFAULT_ZONE): DaySpan => {
	const utcSpan = toUtcDaySpan(date);
	const { span: localSpan, start: localStart, end: localEnd } = toLocalDaySpan(date, timeZone);

	return {
		utcSpan,
		localSpan,
		localStart,
		localEnd
	};
};

export const getDaySpanForJsDate = (date: Date, timeZone: string = DEFAULT_ZONE): DaySpan => {
	const dateTime = DateTime.fromJSDate(date);
	return getDaySpanForDateTime(dateTime, timeZone);
};

export const getRangeSpanForInterval = (range: Interval, timeZone: string = DEFAULT_ZONE): DaySpan => {
	const utcStart = range.start!.setZone(DEFAULT_ZONE, { keepLocalTime: true }).startOf('day');
	const utcEnd = range.end!.setZone(DEFAULT_ZONE, { keepLocalTime: true }).endOf('day');
	const localStart = range.start!.setZone(timeZone, { keepLocalTime: true }).startOf('day');
	const localEnd = range.end!.setZone(timeZone, { keepLocalTime: true }).endOf('day');

	return {
		utcSpan: Interval.fromDateTimes(utcStart, utcEnd),
		localSpan: Interval.fromDateTimes(localStart, localEnd),
		localStart,
		localEnd
	};
};
