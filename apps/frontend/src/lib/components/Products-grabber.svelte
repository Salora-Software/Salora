<script lang="ts">
	import { onMount, type ComponentProps } from 'svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Grip, GripVertical } from 'lucide-svelte';
	import { draggable, type DragEventData } from '@neodrag/svelte';
	import { cn } from '$lib/utils';
	let initialPos = $state({ x: 0, y: 0 });
	let position = $state({ x: 0, y: 0 });
	let { ref = $bindable(null), ...restProps } = $props();
</script>

<div class="singleGrid grid grid-cols-1 grid-rows-1 items-center gap-2" bind:this={ref}>
	<div class={cn('bg-muted h-full  w-min rounded-md p-2 ')}>
		<GripVertical {...restProps} />
	</div>
</div>

<style>
	.singleGrid > div {
		grid-row: 1;
		grid-column: 1;
	}
</style>
