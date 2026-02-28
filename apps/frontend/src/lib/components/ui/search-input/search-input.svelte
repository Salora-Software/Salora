<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	// New imports for enhanced search input UI
	import { Input } from '$lib/components/ui/input';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Search from '@lucide/svelte/icons/search';

	const uid = $props.id();

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		error = false,
		...restProps
	}: WithElementRef<HTMLInputAttributes> & { error?: boolean } = $props();
</script>

<div class="*:not-first:mt-2">
	<div class="relative">
		<Input id={uid} class={cn('peer ps-9 pe-9', className)} {...restProps} bind:value />
		<div
			class="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50"
		>
			<Search size={16} />
		</div>
		<button
			class="text-muted-foreground/80 ring-offset-background hover:text-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-ring/30 absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg transition-shadow focus-visible:border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Submit search"
			type="submit"
		>
			<ArrowRight size={16} aria-hidden="true" />
		</button>
		<button
			class="text-muted-foreground/80 ring-offset-background hover:text-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-ring/30 absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg transition-shadow focus-visible:border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Submit search"
			type="submit"
		>
			<ArrowRight size={16} aria-hidden="true" />
		</button>
	</div>
</div>
