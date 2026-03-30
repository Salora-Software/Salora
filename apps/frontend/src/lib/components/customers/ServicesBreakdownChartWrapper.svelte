<script lang="ts">
	import { PieChart, Text } from 'layerchart';
	import * as Chart from '$lib/components/ui/chart/index.js';

	let { data, config }: { data: any[]; config: any } = $props();
</script>

<Chart.Container {config} class="mx-auto aspect-square max-h-62.5">
	<PieChart
		{data}
		key="service"
		value="count"
		cRange={data.map((d) => d.color)}
		c="color"
		innerRadius={-20}
		cornerRadius={5}
		padAngle={0.02}
		legend
		props={{
			pie: {
				motion: 'tween'
			}
		}}
	>
		{#snippet tooltip()}
			<Chart.Tooltip hideLabel />
		{/snippet}
		{#snippet aboveMarks()}
			<Text
				value={data.reduce((acc, d) => acc + d.count, 0)}
				textAnchor="middle"
				verticalAnchor="middle"
				class="fill-foreground !text-4xl"
				dy={4}
			/>
			<Text
				value="totaal"
				textAnchor="middle"
				verticalAnchor="middle"
				class="fill-foreground/60 text-sm "
				dy={26}
			/>
		{/snippet}
	</PieChart>
</Chart.Container>
