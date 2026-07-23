import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';
import { getSession } from '$lib/auth-client';
import { env } from '$env/dynamic/public';

export const ssr = true;

export const load: LayoutLoad = async ({ fetch }) => {
	console.log(env.PUBLIC_BACKEND_URL);
	const { data } = await getSession({
		fetchOptions: {
			customFetchImpl: fetch
		}
	});
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});

	return {
		queryClient,
		session: data
	};
};
