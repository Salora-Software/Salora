<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { curveMonotoneX } from 'd3-shape';
	import { scaleUtc } from 'd3-scale';
	import { AreaChart } from 'layerchart';

	let {
		chartData,
		chartVisibility
	}: {
		chartData: {
			date: Date;
			bookings: number;
			revenue: number;
			customers: number;
			newCustomers: number;
		}[];
		chartVisibility: {
			bookings: boolean;
			revenue: boolean;
			customers: boolean;
			newCustomers: boolean;
		};
	} = $props();

	const chartConfig = {
		bookings: { label: 'Afspraken', color: '#3b82f6' },
		revenue: { label: 'Omzet', color: '#22c55e' },
		customers: { label: 'Klanten', color: '#f97316' },
		newCustomers: { label: 'Nieuwe Klanten', color: '#a855f7' }
	} satisfies Chart.ChartConfig;

	let activeSeries = $derived([
		...(chartVisibility.bookings
			? [{ key: 'bookings', label: chartConfig.bookings.label, color: chartConfig.bookings.color }]
			: []),
		...(chartVisibility.revenue
			? [{ key: 'revenue', label: chartConfig.revenue.label, color: chartConfig.revenue.color }]
			: []),
		...(chartVisibility.customers
			? [
					{
						key: 'customers',
						label: chartConfig.customers.label,
						color: chartConfig.customers.color
					}
				]
			: []),
		...(chartVisibility.newCustomers
			? [
					{
						key: 'newCustomers',
						label: chartConfig.newCustomers.label,
						color: chartConfig.newCustomers.color
					}
				]
			: [])
	]);

	const dayMs = 24 * 60 * 60 * 1000;

	const toDate = (value: Date | string | number) => {
		const parsed = value instanceof Date ? value : new Date(value);
		return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	};

	const getGranularity = () => {
		if (chartData.length < 2) return 'daily' as const;
		const first = toDate(chartData[0].date);
		const second = toDate(chartData[1].date);
		const diffDays = Math.max(1, Math.round((second.getTime() - first.getTime()) / dayMs));

		if (diffDays >= 360) return 'yearly' as const;
		if (diffDays >= 27) return 'monthly' as const;
		if (diffDays >= 6) return 'weekly' as const;
		return 'daily' as const;
	};

	const formatTooltipDate = (value: Date | string | number) => {
		const date = toDate(value);
		const granularity = getGranularity();

		if (granularity === 'yearly') {
			return new Intl.DateTimeFormat('nl-NL', { year: 'numeric' }).format(date);
		}

		if (granularity === 'monthly') {
			return new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(date);
		}

		if (granularity === 'weekly') {
			const end = new Date(date.getTime() + 6 * dayMs);
			const sameMonth =
				date.getMonth() === end.getMonth() && date.getFullYear() === end.getFullYear();

			const startText = new Intl.DateTimeFormat('nl-NL', {
				day: '2-digit',
				month: 'short'
			}).format(date);
			const endText = new Intl.DateTimeFormat('nl-NL', {
				day: '2-digit',
				month: sameMonth ? undefined : 'short',
				year: 'numeric'
			}).format(end);

			return `${startText} - ${endText}`;
		}

		return new Intl.DateTimeFormat('nl-NL', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		}).format(date);
	};
</script>

<div class="flex flex-col gap-8">
	<Chart.Container config={chartConfig} class="h-100 w-full">
		<AreaChart
			legend
			data={chartData}
			x="date"
			xScale={scaleUtc()}
			series={activeSeries}
			axis="x"
			props={{
				xAxis: {
					format: (d: Date | string | number) =>
						new Intl.DateTimeFormat('nl-NL', {
							day: '2-digit',
							month: 'short'
						}).format(new Date(d))
				},
				yAxis: {
					format: (v: number) =>
						new Intl.NumberFormat('nl-NL', {
							notation: 'compact',
							maximumFractionDigits: 1
						}).format(v)
				},
				area: {
					curve: curveMonotoneX,
					'fill-opacity': 0.4,
					line: { class: 'stroke-1' },
					motion: 'tween'
				}
			}}
		>
			{#snippet tooltip()}
				<Chart.Tooltip labelFormatter={(v: Date | string | number) => formatTooltipDate(v)} />
			{/snippet}
		</AreaChart>
	</Chart.Container>
</div>
