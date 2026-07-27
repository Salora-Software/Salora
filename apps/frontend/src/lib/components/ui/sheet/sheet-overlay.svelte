<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.OverlayProps = $props();
</script>

<SheetPrimitive.Overlay
	bind:ref
	data-slot="sheet-overlay"
	class={cn(
		'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs',
		'data-[state=open]:animate-in data-[state=closed]:animate-out',
		'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
		'ease-out data-[state=closed]:duration-200 data-[state=open]:duration-200',
		className
	)}
	{...restProps}
/>
