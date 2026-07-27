<script lang="ts">
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import * as Card from './ui/card';
	import { Separator } from './ui/separator';
	import { Button } from './ui/button';
	import { LoaderCircle } from '@lucide/svelte';

	let {
		ref = $bindable(null),
		description = $bindable(''),
		onsave = $bindable(async () => {}),
		loading = $bindable(false),
		class: className,
		danger = $bindable(false),
		button = $bindable(null),
		children,
		...restProps
	}: {
		description?: string;
		onsave: () => Promise<void>;
		danger?: boolean;
		loading?: boolean;
		button?: string | null;
	} & WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<Card.Root
	class={cn('', className, danger ? ' overflow-hidden border border-red-500' : '')}
	{...restProps}
>
	<form
		onsubmit={async () => {
			loading = true;
			await onsave().catch((e) => {});
			loading = false;
		}}
	>
		<div class="grid h-full grid-rows-[1fr,auto,auto]">
			<Card.Content class={cn('p-4')}>
				{@render children?.()}
			</Card.Content>
			<Separator class={danger ? 'bg-red-300' : ''} />
			<Card.Footer
				class={cn('flex items-center justify-between px-4 py-2', danger ? 'bg-red-100' : '')}
			>
				<div>
					<Card.Description
						class={cn('max-w-87.5 text-sm', danger ? 'text-red-800' : 'text-muted-foreground')}
					>
						{description}
					</Card.Description>
				</div>
				<Button
					disabled={loading}
					class={danger
						? 'w-fit bg-red-800 text-red-100 hover:bg-red-900'
						: 'w-fit bg-gray-100 text-black hover:bg-gray-200'}
					type="submit"
					size="sm"
				>
					{#if loading}
						<LoaderCircle class="ml-2 h-4 w-4 animate-spin" />
					{:else}
						{button ?? 'Opslaan'}
					{/if}
				</Button>
			</Card.Footer>
		</div>
	</form>
</Card.Root>
