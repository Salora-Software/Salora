import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ parent, request }) => {
	let session = (await parent()).session;
	if (!session) {
		session = await auth.api.getSession({
			headers: request.headers
		});
	}
	if (!session) redirect(307, '/login');
};
