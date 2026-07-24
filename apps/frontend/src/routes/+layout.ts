import { dehydrate, QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';
import { getSession } from '$lib/auth-client';
import { orpcT } from '$lib/orpc';

export const ssr = true;

export const load: LayoutLoad = async ({ fetch }) => {
	const { data } = await getSession({
		fetchOptions: {
			customFetchImpl: fetch
		}
	});
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 1000 * 60 * 5,
				staleTime: 1000 * 60 * 1 // (Optioneel, zie punt 3)
			}
		}
	});

	return {
		queryClient,
		session: data,
		get dehydratedState() {
			return dehydrate(queryClient);
		}
	};
};
