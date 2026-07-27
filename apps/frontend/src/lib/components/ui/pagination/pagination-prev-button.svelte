<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { ChevronLeft } from '@lucide/svelte';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { t } from '$lib/translation';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronLeft class="size-4" />
	<span>{t.dateRange.previous}</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	class={cn(
		buttonVariants({
			variant: 'ghost',
			class: 'gap-1 pl-2.5'
		}),
		className
	)}
	children={children || Fallback}
	{...restProps}
/>
