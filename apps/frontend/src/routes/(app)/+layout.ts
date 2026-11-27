import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { BranchesState, SessionUserState, type BranchesType } from '$lib/runes.svelte';
import { createOrpcClient } from '$lib/orpc';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

/**
 * On client navigations, prefer the last branch the user switched to (stored in
 * a cookie) over `session.activeOrganizationId`, because the root session data
 * can be stale after an in-app branch switch.
 */
function getActiveOrganizationIdFromCookie(): string | undefined {
	if (typeof document === 'undefined') return undefined;

	const match = document.cookie.match(/(?:^|;\s*)cache_org_active=([^;]+)/);
	if (!match) return undefined;

	try {
		return decodeURIComponent(match[1]) || undefined;
	} catch {
		return undefined;
	}
}

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

	const preferredActiveId =
		getActiveOrganizationIdFromCookie() || session.session?.activeOrganizationId;
	const activeOrganizationId = organizationBranches.some(
		(branch) => branch.id === preferredActiveId
	)
		? preferredActiveId
		: organizationBranches[0]?.id;

	if (activeOrganizationId) {
		branchesState.setBranches(organizationBranches, activeOrganizationId);
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
