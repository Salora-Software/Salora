import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const session = (await parent()).session;
	if (session) redirect(307, '/');
	return { session };
};
