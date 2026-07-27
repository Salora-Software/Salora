<script lang="ts">
	import { CircleUser } from '@lucide/svelte';
	import { Menu } from '@lucide/svelte';
	import { Package2 } from '@lucide/svelte';
	import { Search } from '@lucide/svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { t } from '$lib/translation.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import { LoaderCircle, Plus } from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Employees from '$lib/components/Employees.svelte';
	import { onMount } from 'svelte';
	import { organization } from '$lib/auth-client';
	import { trpc } from '$lib/trpc';

	let { data } = $props();

	let activeBranch = $state(data.branchesState.getActiveBranch());
	data.branchesState.onBranchChange(() => {
		activeBranch = data.branchesState.getActiveBranch();
	});
	let newEmployee = $state(() => {});
	onMount(async () => {
		data.branchesState.updateBranches();
	});
</script>

<div class="mb-2 flex flex-wrap justify-between">
	<div class="flex h-min items-center gap-2">
		<h2 class="text-2xl font-semibold">{t.pages.employees}</h2>
		<Tooltip.Provider delayDuration={150}>
			<Tooltip.Root>
				<Tooltip.Trigger class="flex items-center gap-2">
					<h3 class="flex items-center justify-center rounded-full bg-gray-100 p-1 px-2">
						{#if activeBranch?.maxMembers}
							{activeBranch?.members.length} / {activeBranch?.maxMembers}
						{:else}
							{activeBranch?.members.length}
						{/if}
					</h3>
					<h3 class="text-sm">Totaal</h3>
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom">
					<p>
						{#if activeBranch?.maxMembers}
							{activeBranch?.members.length} van de {activeBranch?.maxMembers} medewerkers is toegevoegd.
						{:else}
							{activeBranch?.members.length} medewerkers zijn toegevoegd.
						{/if}
					</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</div>
	<Button variant="outline" onclick={() => newEmployee()}>
		<Plus />
		<span class="hidden sm:inline"> Voeg medewerker toe </span>
	</Button>
</div>
<Separator />
{#if activeBranch}
	<Employees bind:newEmployee />
{:else}
	<LoaderCircle />
{/if}
