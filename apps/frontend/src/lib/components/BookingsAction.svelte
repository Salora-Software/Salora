<script lang="ts">
	import Ellipsis from 'lucide-svelte/icons/ellipsis';
	import { Calendar, IdCardIcon, Trash2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let {
		id,
		customerId,
		status,
		onDelete = () => {}
	}: {
		id: string;
		customerId: string;
		status: string;
		onDelete?: () => void;
	} = $props();

	function handleViewInCalendar() {
		goto(`/calendar?id=${id}`);
	}

	function handleDelete() {
		// TODO: Implement delete functionality
		onDelete();
		toast.success('Boeking is verwijderd');
	}

	function handleCopyId() {
		navigator.clipboard.writeText(id);
		toast.success('Boeking ID is gekopieerd');
	}
</script>

<div class="flex justify-end">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">Open menu</span>
					<Ellipsis class="size-4" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading>Acties</DropdownMenu.GroupHeading>
				<DropdownMenu.Item onclick={handleCopyId}>
					<IdCardIcon class="size-4" />

					Kopieer ID</DropdownMenu.Item
				>
				<DropdownMenu.Item onclick={handleViewInCalendar}>
					<Calendar class="size-4" />
					Bekijk in kalender
				</DropdownMenu.Item>
			</DropdownMenu.Group>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={handleDelete} class="text-destructive focus:text-destructive">
				<Trash2 class="size-4" />
				Verwijderen
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
