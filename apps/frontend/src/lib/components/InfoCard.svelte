<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowUp from '@solar-icons/svelte/linear/alt-arrow-up';
	import ArrowDown from '@solar-icons/svelte/linear/alt-arrow-down';
	let {
		class: className,
		name,
		title,
		description,
		icon,
		loading,
		trend,
		...restProps
	}: {
		class?: string | undefined;
		name?: string | undefined;
		title?: string | undefined;
		description?: string | undefined;
		loading?: boolean | undefined;
		icon?: ConstructorOfATypedSvelteComponent | undefined;
		trend?: number | undefined;
	} = $props();

	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { cn } from '$lib/utils.js';
</script>

<Card.Root class={cn('', className)} {...restProps}>
	<Card.Header>
		<Card.Title class="text-md flex w-full justify-between">
			<p>
				{name}
			</p>
			{#if icon}
				{@const Icon = icon}
				<Icon size="20" />
			{/if}
		</Card.Title>
	</Card.Header>
	<Card.Footer>
		<div>
			{#if loading}
				<Skeleton class="mt-5 h-6.25 w-25 rounded-md" />
				<Skeleton class="mt-2 h-5 w-40 rounded-md" />
			{:else}
				<h1 class=" mt-5 text-2xl font-bold">{title}</h1>
				{#if trend !== undefined}
					<div class="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
						<span
							class={cn(
								'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
								trend >= 0
									? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
									: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
							)}
						>
							{#if trend >= 0}
								<ArrowUp size="12" />
							{:else}
								<ArrowDown size="12" />
							{/if}
							{trend >= 0 ? '+' : ''}{trend}%
						</span>
						<span class="text-muted-foreground">t.o.v. vorige maand</span>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm text-balance">{description}</p>
				{/if}
			{/if}
		</div>
	</Card.Footer>
</Card.Root>

<style>
</style>
