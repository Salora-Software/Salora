import { Interval } from "luxon";
import { ProcessingContext, SchedulerModule } from "../core/types";
import { IntervalUtils } from "../core/utils";

export interface BookingSubtractionConfig {
	slotDurationMinutes: number;
}

export class BookingSubtractionModule implements SchedulerModule<BookingSubtractionConfig> {
	run<T extends BookingSubtractionConfig>(context: ProcessingContext<T>): ProcessingContext<T> {
		// 1. Haal de intervallen van de geblokkeerde periodes op en merge ze
		// Dit voorkomt 'slivers' van tijd tussen aangrenzende blokkades
		const blockedIntervals = IntervalUtils.merge(
			context.input.blockedPeriods.map((b) => b.interval),
		);

		// 2. Trek alle geblokkeerde intervallen af van de huidige beschikbare intervallen
		let resultIntervals = IntervalUtils.subtract(
			context.intervals,
			blockedIntervals,
		);

		// 3. Filter intervallen die korter zijn dan de minimale slotduur
		const minDuration = context.config.slotDurationMinutes || 0;
		if (minDuration > 0) {
			resultIntervals = resultIntervals.filter(
				(interval) => interval.length("minutes") >= minDuration,
			);
		}

		return {
			...context,
			intervals: resultIntervals,
		};
	}
}
