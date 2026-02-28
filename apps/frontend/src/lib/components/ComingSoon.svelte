<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className
	}: WithElementRef<HTMLInputAttributes> = $props();
</script>

<div class={cn('my-4 text-lg text-gray-600', className)} bind:this={ref}>
	Sorry, maar er wordt nog hard aan deze functie gewerkt!
</div>
