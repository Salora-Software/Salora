<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	import { mode } from 'mode-watcher';
	import { onMount } from 'svelte';

	let { ...restProps }: SonnerProps = $props();

	let container = $state<HTMLElement | null>(null);

	onMount(() => {
		// Zoek de dichtstbijzijnde shadow root of gebruik het document
		const root = container?.getRootNode();
		if (root instanceof ShadowRoot || root instanceof Document) {
			// svelte-sonner ondersteunt vaker een container prop of we kunnen portalen forceren
		}
	});
</script>

<div bind:this={container}>
	<Sonner
		theme={mode.current}
		class="toaster group"
		style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
		{...restProps}
	></Sonner>
</div>
