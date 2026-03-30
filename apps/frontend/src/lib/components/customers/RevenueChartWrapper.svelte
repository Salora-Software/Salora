<script lang="ts">
	import { AreaChart } from 'layerchart';
	import { curveBumpX } from 'd3-shape';
	import { scaleUtc } from 'd3-scale';
	import * as Chart from '$lib/components/ui/chart/index.js';

	let {
		data,
		config,
		groupingStrategy = 'monthly'
	}: { data: any[]; config: any; groupingStrategy?: string } = $props();

	// Function to format dates based on grouping strategy
	const formatChartDate = (date: Date, strategy: string) => {
		switch (strategy) {
			case 'hourly':
				return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
			case 'daily':
				return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
			case 'weekly':
				return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
			case 'monthly':
				return date.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
			case 'yearly':
				return date.toLocaleDateString('nl-NL', { year: 'numeric' });
			default:
				return date.toLocaleDateString('nl-NL', { month: 'short' });
		}
	};

	// Function to format tooltip dates based on grouping strategy
	const formatTooltipDate = (date: Date, strategy: string) => {
		switch (strategy) {
			case 'hourly':
				return `${date.toLocaleDateString('nl-NL', {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})} om ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
			case 'daily':
				return date.toLocaleDateString('nl-NL', {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});
			case 'weekly':
				// For weekly, show the range
				return `Week van ${date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
			case 'monthly':
				return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
			case 'yearly':
				return date.toLocaleDateString('nl-NL', { year: 'numeric' });
			default:
				return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
		}
	};
</script>

<Chart.Container {config} class="h-75 w-full">
	<AreaChart
		{data}
		x="date"
		xScale={scaleUtc()}
		yDomain={[0, null]}
		yNice
		series={[
			{
				key: 'income',
				label: config.income.label,
				color: config.income.color
			},
			{
				key: 'appointmentCount',
				label: config.appointmentCount.label,
				color: config.appointmentCount.color
			}
		]}
		props={{
			area: {
				curve: curveBumpX,
				motion: 'tween'
			},
			xAxis: {
				format: (v: Date) => formatChartDate(v, groupingStrategy)
			}
		}}
	>
		{#snippet tooltip()}
			<Chart.Tooltip
				labelFormatter={(v: Date) => formatTooltipDate(v, groupingStrategy)}
				indicator="line"
			/>
		{/snippet}
	</AreaChart>
</Chart.Container>
