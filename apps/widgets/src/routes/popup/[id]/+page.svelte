<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { onMount, setContext } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { page } from '$app/state';
	import BookingWidget from '$lib/components/BookingWidget.svelte';
	import { createTrpcClient } from '$lib/trpc.js';
	let open = $state(true);
	let { data } = $props();
	let branch = $derived(data.branch);
	let collapsed = $state(false);
	let widgetRef = $state<BookingWidget>();
	onMount(() => {
		window.addEventListener('message', (event) => {
			if (typeof event.data.open === 'boolean') {
				open = event.data.open;
			}
		});
	});
	const trpc = createTrpcClient();
	setContext('trpc', trpc);
</script>

<Dialog.Root
	bind:open
	onOpenChange={async (open) => {
		if (!open) {
			window.parent.postMessage({ open: false }, '*');
			if (widgetRef) {
				widgetRef.resetWidget();
			}
		}
	}}
>
	<Dialog.Content
		class={cn(
			'h-[500px] max-h-[calc(100%-1rem)] w-[840px] max-w-[calc(100%-1rem)] gap-0 border-none   bg-transparent p-0 transition-all duration-300',
			collapsed ? 'w-[546px]' : ''
		)}
	>
		{#if branch}
			<BookingWidget
				bind:this={widgetRef}
				{branch}
				bind:collapsed
				onCollapsedChange={(newCollapsed) => (collapsed = newCollapsed)}
			/>
		{:else}
			<div
				class="bg-widget-content-bg flex h-full w-full flex-col items-center justify-center rounded-md p-4"
			>
				<h1 class="text-widget-content-text text-2xl">Vestiging niet gevonden</h1>
				<p class="text-widget-content-text-muted">Neem contact op met de eigenaar!</p>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
