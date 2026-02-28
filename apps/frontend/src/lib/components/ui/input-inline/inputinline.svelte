<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let {
		id,
		value = $bindable(),
		class: className,
		prefix = '€',
		suffix = 'EUR',
		ref = $bindable(null),
		...restProps
	}: HTMLInputAttributes & {
		prefix?: string;
		suffix?: string;
		ref?: HTMLInputElement | null;
	} = $props();
</script>

<div class="relative flex w-full rounded-lg shadow-xs shadow-black/[.04]">
	<span
		class="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center justify-center ps-3 text-sm"
	>
		{prefix}
	</span>
	<input
		bind:this={ref}
		{id}
		class={cn(
			'border-input bg-background selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-s-md border border-r-0 px-3 py-1 ps-8 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 ',
			'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-0.75',
			'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive z-1',
			className
		)}
		bind:value
		placeholder="0.00"
		type="text"
		{...restProps}
	/>
	<span
		class={cn(
			'border-input bg-background dark:bg-input/30 text-muted-foreground z-0 inline-flex h-9 items-center rounded-e-md border px-3 text-sm',
			className
		)}
	>
		{suffix}
	</span>
</div>
