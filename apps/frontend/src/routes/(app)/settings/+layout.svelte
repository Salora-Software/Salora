<script lang="ts">
	import { getBranchesContext } from '$lib/context/branches-context';
	import { page } from '$app/state';
	import { Separator } from '$lib/components/ui/separator/index';
	import { t } from '$lib/translation.js';
	import { cn } from '$lib/utils.js';
	import LoaderCircle from '@solar-icons/svelte/linear/loader';
	let { children, data } = $props();
	const branchesState = getBranchesContext();
</script>

{#if (branchesState.value.branches.length ?? data.branches?.length ?? 0) !== 0}
	<div class="h-full">
		<div class="h-full items-center md:flex-row md:items-start md:gap-6">
			<div class={cn('h-full w-full', !page.data.fullWidth ? 'mx-auto mt-6' : '')}>
				{@render children()}
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-full w-full items-center justify-center">
		<LoaderCircle class="text-muted-foreground h-12 w-12 animate-spin" />
	</div>
{/if}
