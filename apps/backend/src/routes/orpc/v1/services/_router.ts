import { base } from "../../bases/public";
import { createServiceHandler } from "./createService.handler";
import { deleteServiceHandler } from "./deleteService.handler";
import { getServicesHandler } from "./getServices.handler";
import { updateServiceHandler } from "./updateService.handler";

export const serviceRouter = base.router({
  getServices: getServicesHandler,
  createService: createServiceHandler,
  updateService: updateServiceHandler,
  deleteService: deleteServiceHandler,
});
