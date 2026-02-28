<script lang="ts">
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { browser } from '$app/environment';

	let {
		ref = $bindable(null),
		rendered = $bindable(false),
		loading = $bindable(false),
		class: className,
		options,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		options: ApexCharts.ApexOptions;
		rendered?: boolean;
		loading?: boolean;
	} = $props();
	let ApexCharts: typeof import('apexcharts') | null = null;
	if (browser) {
		import('apexcharts').then((apex) => {
			ApexCharts = apex.default;
			rendered = true;
		});
	}

	// Create dark mode chart options
	let darkModeOptions = $derived({
		...options,
		theme: {
			...options.theme,
			mode: mode.current === 'dark' ? 'dark' : 'light'
		},
		chart: {
			...options.chart,
			background: 'transparent'
		}
	});

	$effect(() => {
		if (rendered && ApexCharts && ref) {
			//delete previous chart
			if (ref.firstChild) {
				ref.firstChild.remove();
			}
			const chart = new ApexCharts(ref, darkModeOptions);
			chart.render();
		}
	});
</script>

{#if !loading}
	<div bind:this={ref} {...restProps} class={cn('!min-h-[max-content] w-full ', className)}></div>
{:else}
	<Skeleton class={cn('h-87.5 w-full rounded-md', className)} />
{/if}
