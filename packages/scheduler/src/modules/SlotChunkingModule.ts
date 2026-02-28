import { Interval } from "luxon";
import { ProcessingContext, SchedulerModule } from "../core/types";
import { generateTimeGrid } from "../utils/grid";


export interface ChunkingConfig {
	slotDurationMinutes: number;
	gridStrategy?: "fixed" | "flexible";
}
export class SlotChunkingModule implements SchedulerModule<ChunkingConfig> {
	run<T extends ChunkingConfig>(context: ProcessingContext<T>): ProcessingContext<T> {
		const { slotDurationMinutes, gridStrategy } = context.config;

		if (gridStrategy === "flexible") {
			// Gebruik de gaten uit context.intervals direct als bron
			return {
				...context,
				intervals: generateTimeGrid(context.intervals, slotDurationMinutes)
			};
		}

		// Fixed: Pak het hele dag-grid en filter op wat past in de gaten
		const masterGrid = generateTimeGrid([context.input.searchSpan], slotDurationMinutes);
		const validSlots = masterGrid.filter((slot) =>
			context.intervals.some((freeGap) => freeGap.engulfs(slot))
		);

		return { ...context, intervals: validSlots };
	}
}