<script lang="ts">
	import { PieChart, Text } from 'layerchart';
	import { sum } from 'd3-array';
	import * as Chart from '$lib/components/ui/chart/index.js';

	interface DataItem {
		label: string;
		value: number;
		fill: string;
	}

	let { data }: { data: DataItem[] } = $props();

	const total = $derived(sum(data, (d) => d.value));

	// Build chart config dynamically from data
	const chartConfig = $derived(
		data.reduce(
			(acc: Record<string, any>, item, i) => {
				acc[item.label.toLowerCase()] = {
					label: item.label,
					color: item.fill || `var(--chart-${i + 1})`
				};
				return acc;
			},
			{ value: { label: 'Klanten' } }
		)
	) satisfies Chart.ChartConfig;
	console.log(data);
</script>

<div class="flex flex-col gap-16">
	<!-- Semi-circle gauge chart -->
	<div class="relative">
		<div class="h-42.5">
			<div class="h-85">
				<Chart.Container config={chartConfig} class="h-full w-full">
					<PieChart
						{data}
						key="label"
						value="value"
						c="fill"
						range={[-95, 95]}
						innerRadius={-28}
						cornerRadius={6}
						padAngle={0.03}
						props={{
							group: { class: 'stroke-background stroke-[3px]' },
							arc: { motion: { type: 'tween', duration: 400 } }
						}}
					>
						{#snippet aboveMarks()}
							<Text
								value={String(total)}
								textAnchor="middle"
								verticalAnchor="middle"
								class="fill-accent-foreground! text-4xl! font-bold tabular-nums"
								dy={-35}
							/>
							<Text
								value="Klanten"
								textAnchor="middle"
								verticalAnchor="middle"
								class="fill-accent-foreground! text-base!"
								dy={-10}
							/>
						{/snippet}
						{#snippet tooltip()}
							<Chart.Tooltip hideLabel labelKey="label" />
						{/snippet}
					</PieChart>
				</Chart.Container>
			</div>
		</div>
	</div>

	<!-- Legend rows -->
	<div class="space-y-2 px-2">
		{#each data as item}
			{@const pct = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0}
			<div
				class="flex w-full items-center justify-between text-sm transition-opacity hover:opacity-80"
			>
				<div class="flex items-center gap-2">
					<div
						class="h-2.5 w-2.5 shrink-0 rounded-full transition-transform"
						style="background-color: {item.fill}"
					></div>
					<span class="text-foreground">{item.label}</span>
				</div>
				<div class="text-muted-foreground flex items-center gap-2">
					<span class="text-foreground font-semibold tabular-nums">{item.value}</span>
					<span class="text-muted-foreground/40">|</span>
					<span class="w-10 text-right tabular-nums">{pct}%</span>
				</div>
			</div>
		{/each}
	</div>
</div>
