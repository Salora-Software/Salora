<script lang="ts">
	import BookingWidget from '$lib/components/BookingWidget.svelte';
	let { data } = $props();
	let branch = $derived(data.branch);
	let collapsed = $state(false);
	let widgetRef = $state<BookingWidget>();
</script>

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
