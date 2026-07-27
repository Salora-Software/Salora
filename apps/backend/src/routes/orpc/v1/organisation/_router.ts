import { base } from "../../bases/public";
import { createOrganizationHandler } from "./createOrganisation.handler";
import { getOrganizationHandler } from "./getOrganisation.handler";
import { getOrganizationsHandler } from "./getOrganisations.handler";
import { finishOrganizationHandler } from "./finishOrganisation.handler";

export const organisationRouter = base.router({
  getOrganisation: getOrganizationHandler,
  getOrganisations: getOrganizationsHandler,
  createOrganisation: createOrganizationHandler,
  finishOrganisation: finishOrganizationHandler,
});
