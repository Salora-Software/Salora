import type { PageServerLoad } from './$types';
import { trpcOnServer } from '$lib/trpc';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
	const id = params.id;
	const trpc = trpcOnServer(fetch);

	const branch = await trpc.v1.getBranch.query({ id }).catch((e) => {
		console.log(`Failed to fetch branch with id ${id}`, e);
		return null;
	});

	if (!branch) {
		return { branch: null, error: 'BRANCH_NOT_FOUND' };
	}

	const session = (await parent()).session;
	if (!session) {
		return { branch, error: 'UNAUTHORIZED' };
	}

	return { branch, error: null };
};
