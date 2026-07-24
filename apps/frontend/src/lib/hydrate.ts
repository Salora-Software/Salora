import type { QueryClient, DehydratedState } from '@tanstack/svelte-query';

export function customHydrate(client: QueryClient, dehydratedState: DehydratedState | undefined) {
	if (!dehydratedState || !Array.isArray(dehydratedState.queries)) return;

	for (const query of dehydratedState.queries) {
		if (query.queryKey && query.state?.data !== undefined) {
			console.log('Hydrating query:', query.queryKey, 'with data:', query.state.data);
			// Vul de cache rechtstreeks op basis van de queryKey
			client.setQueryData(query.queryKey, query.state.data, {
				updatedAt: query.state.dataUpdatedAt || Date.now()
			});
		}
	}
}
