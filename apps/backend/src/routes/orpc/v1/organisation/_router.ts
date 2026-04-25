import { base } from "../../bases/public";
import { getOrganizationHandler } from "./getOrganisation.handler";

export const organisationRouter = base.router({
  getOrganisation: getOrganizationHandler,
});
