import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, BranchWizardState, type BranchesType } from '$lib/runes.svelte';
import { createOrpcClient, orpcT } from '$lib/orpc';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

export const load: LayoutLoad = async ({ parent, fetch }) => {
	const orpcServer = createTanstackQueryUtils(createOrpcClient(undefined, fetch));
	let data = await parent();
	const session = data.session;
	if (!session) redirect(307, '/login');
	let sessionState = new SessionUserState(session);
	let branchWizardState = new BranchWizardState();

	const branches = await data.queryClient.ensureQueryData(
		orpcServer.v1.organisation.getOrganisations.queryOptions({})
	);

	const organizationBranches = branches as unknown as BranchesType;
	let branchesState = new BranchesState(organizationBranches);
	const activeOrganizationId = session.session?.activeOrganizationId;
	if (activeOrganizationId) {
		branchesState.setBranches(organizationBranches, activeOrganizationId);
	} else if (organizationBranches.length > 0) {
		branchesState.setActiveBranch(0);
	}

	return {
		session: sessionState.value,
		branches: organizationBranches,
		sessionState,
		branchesState,
		branchWizardState
	};
};
