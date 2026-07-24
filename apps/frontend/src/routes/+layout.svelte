<script>
	import { hydrate, HydrationBoundary, QueryClientProvider } from '@tanstack/svelte-query';

	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';

	let { data, children } = $props();

	import { Toaster } from '$lib/components/ui/sonner/index.js';
</script>

<ModeWatcher defaultMode="light" />
<div>
	<Toaster position={'top-right'} richColors />
	<QueryClientProvider client={data.queryClient}>
		<HydrationBoundary
			state={data.dehydratedState}
			queryClient={data.queryClient}
			options={{
				defaultOptions: {
					queries: {
						gcTime: 1000 * 60 * 5
					}
				}
			}}
		>
			{@render children()}
		</HydrationBoundary>
	</QueryClientProvider>
</div>
