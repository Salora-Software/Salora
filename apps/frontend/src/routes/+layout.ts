import { dehydrate, QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';

export const ssr = true;

export const load: LayoutLoad = async ({ fetch }) => {
	// Use a relative URL so SSR and preview deployments authenticate against
	// their own origin (SvelteKit's fetch forwards cookies for same-origin).
	const sessionResponse = await fetch('/api/auth/get-session');
	const data = sessionResponse.ok ? await sessionResponse.json() : null;
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
