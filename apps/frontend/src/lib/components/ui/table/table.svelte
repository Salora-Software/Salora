<script lang="ts">
	import type { HTMLTableAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div class="grid w-full grid-cols-1">
	<div class="relative w-full overflow-auto">
		<table
			bind:this={ref}
			class={cn('w-full caption-bottom border-spacing-0 text-sm', className)}
			{...restProps}
		>
			{@render children?.()}
		</table>
	</div>
</div>
