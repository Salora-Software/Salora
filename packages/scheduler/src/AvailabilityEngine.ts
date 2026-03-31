import { Interval } from "luxon";
import {
  SchedulerInput,
  SchedulerModule,
  ProcessingContext,
} from "./core/types";
import { BufferModule } from "./modules/BufferModule";
import { BookingSubtractionModule } from "./modules/BookingSubtractionModule";
import { SlotChunkingModule } from "./modules/SlotChunkingModule";

// 1. De Builder: Verzamelt modules en bouwt het gecombineerde TConfig type op
export class AvailabilityEngine<TConfig extends object = {}> {
  constructor(private modules: any[] = []) {}

  public use<MConfig>(
    module: SchedulerModule<MConfig>,
  ): AvailabilityEngine<TConfig & MConfig> {
    return new AvailabilityEngine<TConfig & MConfig>([...this.modules, module]);
  }

  public useDefaultPipeline() {
    return this.use(new BufferModule())
      .use(new BookingSubtractionModule())
      .use(new SlotChunkingModule());
  }

  // Injecteer de config en retourneer de daadwerkelijke, uitvoerbare engine
  public withConfig(config: TConfig): ConfiguredEngine<TConfig> {
    return new ConfiguredEngine(this.modules, config);
  }
}

// 2. De Uitvoerder: Heeft de vaste modules en de vaste config
export class ConfiguredEngine<TConfig> {
  constructor(
    private modules: SchedulerModule<any>[],
    private config: TConfig,
  ) {}

  public getAvailableSlots(input: SchedulerInput): { intervals: Interval[] } {
    let context: ProcessingContext<TConfig> = {
      config: this.config,
      input,
      intervals: [input.searchSpan],
    };
    const processStart = Date.now();

    for (const module of this.modules) {
      context = module.run(context);
      if (context.intervals.length === 0) {
        break;
      }
    }

    const processEnd = Date.now();
    console.log(`Occupancy berekend in ${processEnd - processStart}ms`);

    return { intervals: context.intervals };
  }
}
