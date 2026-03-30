import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { env } from '$lib/server/env';

export const load: LayoutServerLoad = async ({ parent, request }) => {
	let session = (await parent()).session;
	if (!session) {
		session = await auth.api.getSession({
			headers: request.headers
		});
	}
	console.log('Session in root layout load:', env?.DEPLOY_TARGET);
	if (!session) redirect(307, '/login');
};
