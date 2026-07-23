import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, BranchWizardState } from '$lib/runes.svelte';
import { orpc } from '$lib/orpc';

export const load: LayoutLoad = async ({ parent }) => {
	let session = (await parent()).session;
	if (!session) redirect(307, '/login');
	let sessionState = new SessionUserState(session);
	let branchesState = new BranchesState();
	let branchWizardState = new BranchWizardState();

	//get all branches
	const branches = await orpc.v1.organisation.getOrganisations();
	return {
		session: sessionState.value,
		branches: branches,
		sessionState,
		branchesState,
		branchWizardState
	};
};
