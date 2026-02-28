<script lang="ts">
	import { Separator as SeparatorPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		orientation = 'horizontal',
		...restProps
	}: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
	bind:ref
	class={cn(
		'bg-border shrink-0',
		orientation === 'horizontal' ? 'h-0.25 w-full' : 'min-h-full w-0.25',
		className
	)}
	{orientation}
	{...restProps}
/>
