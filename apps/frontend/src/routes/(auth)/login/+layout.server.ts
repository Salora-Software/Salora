import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const ssr = true;

export const load: LayoutServerLoad = async ({ parent }) => {
	const session = (await parent()).session;
	if (session) redirect(307, '/');
	return { session };
};
