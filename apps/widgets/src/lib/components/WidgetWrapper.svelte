<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { createTrpcClient } from '$lib/trpc';
	import BookingWidget from './BookingWidget.svelte';
	import { BitsConfig } from 'bits-ui';
	import type { RouterOutput } from '@salora/trpc-types';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher, setMode, setTheme, theme } from 'mode-watcher';
	import Themer from '$lib/components/Themer.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let { variant = 'widget', branchId, endpoint = 'https://app.salora.app' } = $props();
	let branchData: RouterOutput['v1']['getBranch'] | null = $state(null);
	let loading = $state(true);

	const mode = 'light';
	setMode(mode);

	const trpc = createTrpcClient(endpoint);

	// Maak de data beschikbaar voor alle diepe componenten (simuleert SSR data)
	setContext('branch', () => branchData);
	setContext('trpc', trpc);

	onMount(async () => {
		try {
			// Gebruik v1.getBranch zoals in de originele layout.server.ts
			branchData = await trpc.v1.getBranch.query({
				id: branchId
			});
		} catch (e) {
			console.error('Error fetching branch:', e);
		} finally {
			loading = false;
		}

		// Luister naar berichten voor mode/theme updates (vanuit de embed script omgeving)
		window.addEventListener('message', (event) => {
			if (event.data.type === 'updateMode' && typeof event.data.modeType === 'string') {
				setMode(event.data.modeType);
			}
			if (event.data.type === 'updateTheme' && typeof event.data.color === 'string') {
				setTheme(event.data.color);
			}
		});
	});

	let container = $state<HTMLElement | undefined>(undefined);
	let collapsed = $state(false);
	let cardWidth = $state(0);
</script>

<ModeWatcher
	track={false}
	defaultMode={mode}
	modeStorageKey={`salora-mode-${branchId}`}
	themeStorageKey={`salora-theme-${branchId}`}
/>

<BitsConfig defaultPortalTo={container}>
	<div bind:this={container} class="salora-widget-root">
		<div
			class={cn('w-4xl max-w-full h-125 transition-all duration-300')}
			style:width={collapsed ? `${cardWidth}px` : ''}
		>
			<Toaster position={'top-right'} richColors />
			{#if loading}
				<div
					class="bg-widget-content-bg flex h-full w-full flex-col items-center justify-center rounded-md p-4 shadow-sm"
				>
					<h1 class="text-widget-content-text text-2xl">Gegevens aan het ophalen...</h1>
					<LoaderCircle class="animate-spin text-widget-content-text-muted mt-4" size={32} />
				</div>
			{:else}
				<Themer colorTheme={theme.current}>
					{#if branchData}
						<BookingWidget branch={branchData} bind:collapsed bind:cardWidth />
					{:else}
						<div
							class="bg-widget-content-bg flex h-full w-full flex-col items-center justify-center rounded-md p-4 shadow-sm"
						>
							<h1 class="text-widget-content-text text-2xl">Vestiging niet gevonden</h1>
							<p class="text-widget-content-text-muted">Neem contact op met de eigenaar!</p>
						</div>
					{/if}
				</Themer>
			{/if}
		</div>
	</div>
</BitsConfig>
