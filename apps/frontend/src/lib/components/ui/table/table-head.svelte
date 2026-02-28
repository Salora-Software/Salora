<script lang="ts">
	import type { HTMLThAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
	bind:this={ref}
	class={cn(
		'text-foreground bg-muted/60 h-10 px-4 text-left align-middle font-semibold first:rounded-l-lg last:rounded-r-lg [&:has([role=checkbox])]:pr-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
