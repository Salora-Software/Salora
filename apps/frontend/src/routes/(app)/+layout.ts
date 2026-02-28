import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, BranchWizardState } from '$lib/runes.svelte';

export const load: LayoutLoad = async ({ parent, url, data }) => {
	let session = (await parent()).session;
	if (!session) redirect(307, '/login');
	let sessionState = new SessionUserState();
	let branchesState = new BranchesState();
	let branchWizardState = new BranchWizardState();
	sessionState.value = session;

	// ...existing code...

	return {
		session: sessionState.value,
		branches: branchesState.value.branches,
		sessionState,
		branchesState,
		branchWizardState
	};
};
