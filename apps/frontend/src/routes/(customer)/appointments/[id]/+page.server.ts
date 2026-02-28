import type { PageServerLoad } from './$types';
import { trpc } from '$lib/trpc';

// Simple in-memory cache for branch queries
const branchCache = new Map<string, { data: any; expires: number }>();

export const load: PageServerLoad = async ({ params, parent }) => {
	const id = params.id;
	const now = Date.now();
	const cached = branchCache.get(id);
	let branch = null;
	if (cached && cached.expires > now) {
		branch = cached.data;
		return { branch: cached.data, error: null };
	} else {
		const branchQuery = await trpc.v1.getBranch.query({ id }).catch(() => {});
		if (branch) {
			branchCache.set(id, { data: branchQuery, expires: now + 300_000 }); // 5 minutes
		}
		branch = branchQuery || null;
	}
	if (!branch) {
		return { branch: null, error: 'BRANCH_NOT_FOUND' };
	}

	const session = (await parent()).session;
	if (!session) {
		return { branch, error: 'UNAUTHORIZED' };
	}
	if (!id) return;

	return { branch, error: null };
};
