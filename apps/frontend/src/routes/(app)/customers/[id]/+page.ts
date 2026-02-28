import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	//redirect to path/overview
	const pathname = url.pathname;
	redirect(302, `${pathname}/overview`);
};
