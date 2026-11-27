import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, type BranchesType } from '$lib/runes.svelte';
import { createOrpcClient } from '$lib/orpc';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

export const load: LayoutLoad = async ({ parent, fetch, url }) => {
	const orpcServer = createTanstackQueryUtils(createOrpcClient(url.origin, fetch));
	let data = await parent();
	const session = data.session;
	if (!session) redirect(307, '/login');
	let sessionState = new SessionUserState(session);

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

	// First run: a user without any organization must finish onboarding before
	// entering the app. Onboarding routes themselves are exempt.
	const isOnboardingRoute = url.pathname.startsWith('/onboarding');
	if (!isOnboardingRoute && organizationBranches.length === 0) {
		redirect(307, '/onboarding/welcome');
	}

	return {
		session: sessionState.value,
		branches: organizationBranches,
		sessionState,
		branchesState
	};
};
