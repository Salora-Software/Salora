import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, BranchWizardState } from '$lib/runes.svelte';
import { createOrpcClient, orpcT } from '$lib/orpc';
import { browser } from '$app/environment';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { env } from '$env/dynamic/public';

export const load: LayoutLoad = async ({ parent, fetch }) => {
	const orpcServer = createTanstackQueryUtils(createOrpcClient(env.PUBLIC_BACKEND_URL, fetch));
	let data = await parent();
	const session = data.session;
	if (!session) redirect(307, '/login');
	let sessionState = new SessionUserState(session);
	let branchesState = new BranchesState();
	let branchWizardState = new BranchWizardState();

	const branches = await data.queryClient.ensureQueryData(
		orpcServer.v1.organisation.getOrganisations.queryOptions({})
	);
	return {
		session: sessionState.value,
		branches: branches,
		sessionState,
		branchesState,
		branchWizardState
	};
};
