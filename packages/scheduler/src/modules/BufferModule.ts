import { ProcessingContext, SchedulerModule } from "../core/types";

export interface BufferConfig {
  bufferMinutes: number;
}

export class BufferModule implements SchedulerModule<BufferConfig> {
  run<T extends BufferConfig>(
    context: ProcessingContext<T>,
  ): ProcessingContext<T> {
    const bufferedPeriods = context.input.blockedPeriods.map((block) => {
      // 1. Zoek naar een specifieke buffer in de boeking zelf
      // 2. Val anders terug op een eventuele globale default
      // 3. Gebruik 0 als er niks is ingesteld
      const bufferToApply =
        block.metadata.bufferMinutes ?? context.config.bufferMinutes ?? 0;

      if (
        bufferToApply > 0 &&
        block.metadata.type === "booking" &&
        block.interval.isValid &&
        block.interval.end
      ) {
        return {
          ...block,
          interval: block.interval.set({
            end: block.interval.end.plus({
              minutes: bufferToApply,
            }),
          }),
        };
      }
      return block;
    });

    return {
      ...context,
      input: { ...context.input, blockedPeriods: bufferedPeriods },
    };
  }
}
