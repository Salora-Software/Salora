<script lang="ts">
	import { Ellipsis } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';

	let {
		id,
		onDelete,
		onEdit,
		type = 'service'
	}: {
		id: string;
		onDelete?: (type: 'service' | 'package') => void;
		onEdit?: () => void;
		type?: 'service' | 'package';
	} = $props();
</script>

<div class="flex justify-end">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">Open menu</span>
					<Ellipsis />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading>Acties</DropdownMenu.GroupHeading>
				<DropdownMenu.Item
					onclick={() => {
						navigator.clipboard.writeText(id);
						toast.success('ID is gekopieerd');
					}}
				>
					Kopieer ID
				</DropdownMenu.Item>
			</DropdownMenu.Group>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={() => onEdit?.()}>Bewerken</DropdownMenu.Item>
			<DropdownMenu.Item
				class="text-destructive focus:text-destructive"
				onclick={() => onDelete?.(type)}
			>
				Verwijderen
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
