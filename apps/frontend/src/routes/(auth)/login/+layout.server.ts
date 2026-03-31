import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	console.log('Login layout server load');
	const session = (await parent()).session;
	if (session) redirect(307, '/');
	return { session };
};
