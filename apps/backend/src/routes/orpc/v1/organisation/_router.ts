import { base } from "../../bases/public";
import { createOrganizationHandler } from "./createOrganisation.handler";
import { getOrganizationHandler } from "./getOrganisation.handler";
import { getOrganizationsHandler } from "./getOrganisations.handler";

export const organisationRouter = base.router({
  getOrganisation: getOrganizationHandler,
  getOrganisations: getOrganizationsHandler,
  createOrganisation: createOrganizationHandler,
});
