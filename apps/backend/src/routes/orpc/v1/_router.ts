import { base } from "../bases/public";
import { aliveHandler } from "./alive.handler";
import { appointmentRouter } from "./appointment/_router";
import { organisationRouter } from "./organisation/_router";
import { serviceRouter } from "./services/_router";

export const router = base.tag("v1").router({
  alive: aliveHandler,
  appointment: appointmentRouter,
  organisation: organisationRouter,
  service: serviceRouter,
});
