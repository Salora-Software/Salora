import { base } from "../../bases/public";
import { getOpeningTimesHandler } from "./getOpeningTimes.handler";
import { updateOpeningTimesHandler } from "./updateOpeningTimes.handler";

export const scheduleRouter = base.router({
  getOpeningTimes: getOpeningTimesHandler,
  updateOpeningTimes: updateOpeningTimesHandler,
});
