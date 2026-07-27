<script lang="ts">
	import { page } from '$app/state';
	import { Separator } from '$lib/components/ui/separator/index';
	import { t } from '$lib/translation.js';
	import { cn } from '$lib/utils.js';
	import { LoaderCircle } from '@lucide/svelte';
	let { children, data } = $props();
</script>

{#if data.branchesState.value.branches.length !== 0}
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
