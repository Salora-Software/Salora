<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	let {
		class: className,
		name,
		title,
		description,
		icon,
		loading,
		...restProps
	}: {
		class?: string | undefined;
		name?: string | undefined;
		title?: string | undefined;
		description?: string | undefined;
		loading?: boolean | undefined;
		icon?: ConstructorOfATypedSvelteComponent | undefined;
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
				<p class="text-muted-foreground text-sm text-balance">{description}</p>
			{/if}
		</div>
	</Card.Footer>
</Card.Root>

<style>
</style>
