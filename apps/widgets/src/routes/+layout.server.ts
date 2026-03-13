import type { LayoutServerLoad } from './$types';
import { trpc } from '$lib/trpc';

// Simple in-memory cache for branch queries
const branchCache = new Map<string, { data: any; expires: number }>();

export const load: LayoutServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id) return;

	const now = Date.now();
	const cached = branchCache.get(id);
	if (cached && cached.expires > now) {
		return { branch: cached.data };
	}

	const branch = await trpc.v1.getBranch.query({ id }).catch(() => {
		return;
	});
	if (branch) {
		branchCache.set(id, { data: branch, expires: now + 300_000 }); // 5 minutes
	}
	return { branch };
};
