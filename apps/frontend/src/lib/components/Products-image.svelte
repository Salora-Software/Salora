<script lang="ts">
	import { Ellipsis } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import type { BranchesState } from '$lib/runes.svelte';
	import { toast } from 'svelte-sonner';

	let {
		id,
		name,
		price,
		duration,
		values = $bindable(),
		updateServices,
		branchesState
	}: {
		id: string;
		name: string;
		price: number;
		duration: number;
		updateServices: () => void;
		branchesState: BranchesState;
		values: {
			name: {
				value: string;
			};
			price: {
				value: string;
				formatter: (value: string) => string;
			};
			duration: {
				value: string;
				formatter: (value: string, typedValue?: string) => string;
			};
			save: {
				loading: boolean;
			};
			sheet: {
				active: boolean;
				loading: boolean;
				editing: boolean;
			};
		};
	} = $props();
	let activeBranch = $state(branchesState.getActiveBranch());
	branchesState.onBranchChange(() => {
		activeBranch = branchesState.getActiveBranch();
	});
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
				<DropdownMenu.Item onclick={() => navigator.clipboard.writeText(id)}>
					Kopieer ID
				</DropdownMenu.Item>
			</DropdownMenu.Group>
			<DropdownMenu.Separator />
			<DropdownMenu.Item
				onclick={() => {
					values.sheet = {
						...values.sheet,
						active: true,
						editing: true
					};
					values.name.value = name;
					values.price.value = values.price.formatter((price * 100).toString());
					values.duration.value = values.duration.formatter(duration.toString());
				}}>Edit</DropdownMenu.Item
			>
			<DropdownMenu.Item
				onclick={async () => {
					await trpc.v1.authenticated.services.deleteService.mutate({
						organizationId: activeBranch?.id || '',
						serviceId: id
					});
					toast.success('Service is succesvol verwijderd');
					updateServices();
				}}>Delete</DropdownMenu.Item
			>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
