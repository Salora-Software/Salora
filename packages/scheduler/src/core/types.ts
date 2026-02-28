import { DateTime, Interval } from "luxon";

export interface SchedulerConfig {
	slotDurationMinutes: number;
	bufferMinutes?: number;
	gridStrategy?: "fixed" | "flexible";
}

export interface BlockedPeriod {
	id: string;
	interval: Interval;
	metadata: Record<string, any> & { type: string };
}

export interface SchedulerInput {
	searchSpan: Interval;
	blockedPeriods: BlockedPeriod[];
}

export interface ProcessingContext<TConfig = {}> {
	config: TConfig;
	input: SchedulerInput;
	intervals: Interval[];
}

export interface SchedulerModule<MConfig = any> {
	run(context: ProcessingContext<MConfig>): ProcessingContext<MConfig>;
}
