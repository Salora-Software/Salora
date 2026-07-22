import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';
import { getSession } from '$lib/auth-client';

export const ssr = false;

export const load: LayoutLoad = async ({

}) => {
	const { data } = await getSession();
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
