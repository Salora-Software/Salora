<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { Arc, PieChart, Text } from 'layerchart';
	import { AreaChart } from 'layerchart';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import { curveBumpX } from 'd3-shape';
	import { scaleUtc } from 'd3-scale';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		CalendarDays,
		CalendarIcon,
		CircleDollarSign,
		CreditCard,
		Package,
		Receipt,
		UserRoundCheck
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { trpcQuery } from '$lib/trpc';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import { getLocale } from '$lib/translation.js';

	const { data } = $props();

	const locale = getLocale();

	// Date picker setup - default to last 12 months
	const todayDate = today(getLocalTimeZone());
	const presetRange = todayDate.subtract({ days: 13 });

	let selectedDates: DateRange = $state({
		start: presetRange,
		end: todayDate
	});
	let selectedDatesRange: DateRange & { open: boolean } = $state({
		start: undefined,
		end: undefined,
		open: false
	});

	// Preset date ranges
	const presetRanges = [
		{
			label: 'Laatste 7 dagen',
			getValue: () => ({
				start: todayDate.subtract({ days: 6 }),
				end: todayDate
			})
		},
		{
			label: 'Laatste 14 dagen',
			getValue: () => ({
				start: todayDate.subtract({ days: 13 }),
				end: todayDate
			})
		},
		{
			label: 'Laatste 30 dagen',
			getValue: () => ({
				start: todayDate.subtract({ days: 29 }),
				end: todayDate
			})
		},
		{
			label: 'Laatste 3 maanden',
			getValue: () => ({
				start: todayDate.subtract({ months: 3 }),
				end: todayDate
			})
		},
		{
			label: 'Laatste 6 maanden',
			getValue: () => ({
				start: todayDate.subtract({ months: 6 }),
				end: todayDate
			})
		},
		{
			label: 'Laatste jaar',
			getValue: () => ({
				start: todayDate.subtract({ years: 1 }),
				end: todayDate
			})
		},
		{
			label: 'Alle tijd',
			getValue: () => ({
				start: todayDate.subtract({ years: 10 }), // Fallback for very old data
				end: todayDate
			})
		}
	];

	// Function to apply preset date range
	const applyPresetRange = async (preset: (typeof presetRanges)[0]) => {
		const range = preset.getValue();
		selectedDates = range;
		// Clear the calendar range to prevent conflicts
		selectedDatesRange = {
			start: undefined,
			end: undefined,
			open: false
		};
	};

	// Function to check if a preset is currently selected
	const isPresetSelected = (preset: (typeof presetRanges)[0]) => {
		if (!selectedDates.start || !selectedDates.end) return false;
		const range = preset.getValue();
		return (
			selectedDates.start.toString() === range.start.toString() &&
			selectedDates.end.toString() === range.end.toString()
		);
	};

	// Function to get the current selection label
	const getSelectionLabel = () => {
		if (!selectedDates.start || !selectedDates.end) {
			return 'Kies een datumbereik';
		}

		// Check if current selection matches any preset
		for (const preset of presetRanges) {
			if (isPresetSelected(preset)) {
				return preset.label;
			}
		}

		// If no preset matches, show the date range
		return `${df.format(selectedDates.start.toDate(getLocalTimeZone()))} - ${df.format(selectedDates.end.toDate(getLocalTimeZone()))}`;
	};

	const df = new DateFormatter('nl-NL', {
		dateStyle: 'medium'
	});

	// Get active branch and customer ID from page state
	let activeBranch = $state(data.branchesState.getActiveBranch());
	const organizationId = $derived(activeBranch?.id || '');
	const customerId = $derived(page.params.id);

	// Use TRPC to fetch customer overview data with date filtering
	const customerOverviewQuery = $derived(
		trpcQuery.v1.authenticated.customers.getCustomerOverview.createQuery(
			{
				id: customerId,
				organizationId,
				startDate: selectedDates.start?.toString(),
				endDate: selectedDates.end?.toString()
			},
			{
				enabled: !!organizationId && !!customerId,
				refetchOnWindowFocus: false,
				queryKey: [
					'getCustomerOverview',
					customerId,
					organizationId,
					selectedDates.start?.toString(),
					selectedDates.end?.toString()
				]
			}
		)
	);

	// Effect to update selectedDates from calendar
	$effect(() => {
		// Only update selectedDates from calendar if both start and end are defined
		// and the calendar range is different from the current selection
		if (
			selectedDatesRange.start &&
			selectedDatesRange.end &&
			(selectedDatesRange.start !== selectedDates.start ||
				selectedDatesRange.end !== selectedDates.end)
		) {
			selectedDates.start = selectedDatesRange.start;
			selectedDates.end = selectedDatesRange.end;
			selectedDatesRange.open = false;
		}
	});

	// Listen for branch changes
	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	// Derived loading state
	const loading = $derived(customerOverviewQuery.isLoading || customerOverviewQuery.isError);

	// Format the data for display
	const summaryCards = $derived([
		{
			label: 'Laatste bezoek',
			value: customerOverviewQuery.data?.summary.lastVisit
				? new Date(customerOverviewQuery.data.summary.lastVisit).toLocaleDateString('nl-NL', {
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})
				: 'Geen bezoeken',
			icon: CalendarDays,
			color: 'text-amber-500'
		},
		{
			label: 'Loyaliteitspunten',
			value: customerOverviewQuery.data?.summary.loyaltyPoints?.toString() || '0',
			icon: CreditCard,
			color: 'text-emerald-500'
		},
		{
			label: 'Totale afspraken',
			value: customerOverviewQuery.data?.summary.totalAppointments?.toString() || '0',
			icon: Receipt,
			color: 'text-blue-500'
		},
		{
			label: 'Besteed bedrag',
			value: customerOverviewQuery.data?.summary.totalSpent
				? `€ ${customerOverviewQuery.data.summary.totalSpent.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
				: '€ 0,00',
			icon: UserRoundCheck,
			color: 'text-purple-500'
		}
	]);

	// Chart data for monthly bookings
	const chartData = $derived(customerOverviewQuery.data?.monthlyBookings || []);
	const chartMetadata = $derived(customerOverviewQuery.data?.chartMetadata);

	const chartConfig = {
		income: { label: 'Inkomsten', color: '#10b981' },
		appointmentCount: { label: 'Aantal afspraken', color: '#3b82f6' }
	} satisfies Chart.ChartConfig;

	// Function to format dates based on grouping strategy
	const formatChartDate = (date: Date, groupingStrategy?: string) => {
		switch (groupingStrategy) {
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
	const formatTooltipDate = (date: Date, groupingStrategy?: string) => {
		switch (groupingStrategy) {
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

	// Purchase history from recent activity
	const purchaseHistory = $derived(
		customerOverviewQuery.data?.recentActivity.map((activity) => ({
			date: activity.date,
			service: activity.service,
			status: activity.status, // Keep original status format
			amount: activity.amount
		})) || []
	);

	// Services data for pie chart
	const pieChartData = $derived(customerOverviewQuery.data?.serviceDistribution || []);

	const pieChartConfig = $derived({
		count: { label: 'Aantal' },
		...Object.fromEntries(
			pieChartData.map((item) => [item.service, { label: item.service, color: item.color }])
		)
	} satisfies Chart.ChartConfig);
</script>

<!-- Customer Overview Dashboard -->
<div class="space-y-6">
	<!-- Header with Date Picker -->
	<div class="flex flex-col items-start justify-between gap-2 md:flex-row md:items-end">
		<div>
			<h1 class="text-3xl font-semibold">Klant Overzicht</h1>
			<p class="text-muted-foreground mt-2">
				Bekijk de activiteit en statistieken voor deze klant
				{#if selectedDates.start && selectedDates.end}
					({df.format(selectedDates.start.toDate(getLocalTimeZone()))} - {df.format(
						selectedDates.end.toDate(getLocalTimeZone())
					)})
				{/if}
			</p>
		</div>

		<Popover.Root bind:open={selectedDatesRange.open}>
			<Popover.Trigger
				class={cn(
					buttonVariants({
						variant: 'outline',
						class: 'w-full max-w-full justify-start text-left font-normal md:w-[286.4px]'
					})
				)}
			>
				<CalendarIcon />
				{getSelectionLabel()}
			</Popover.Trigger>
			<Popover.Content class="w-fit p-0" align="end" side="bottom">
				<div class="flex">
					<!-- Preset buttons -->
					<div class="flex w-48 flex-col border-r p-3">
						<div class="text-muted-foreground mb-2 text-sm font-medium">Snelle selectie</div>
						<div class="space-y-1">
							{#each presetRanges as preset}
								<button
									class="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors {isPresetSelected(
										preset
									)
										? 'bg-secondary text-secondary-foreground font-medium'
										: 'hover:bg-muted'}"
									onclick={() => applyPresetRange(preset)}
								>
									{preset.label}
								</button>
							{/each}
						</div>
					</div>
					<!-- Calendar -->
					<div class="p-0">
						<RangeCalendar {locale} bind:value={selectedDatesRange} numberOfMonths={2} />
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each summaryCards as card}
			<Card.Root class="overflow-hidden">
				<div class="flex items-start p-6">
					<div class="flex-1">
						<p class="text-muted-foreground text-sm">{card.label}</p>
						{#if loading}
							<Skeleton class="mt-2 h-8 w-24 rounded-md" />
						{:else}
							<h3 class="mt-2 text-2xl font-bold">{card.value}</h3>
						{/if}
					</div>
					<div class="{card.color} bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
						<card.icon class="h-6 w-6" />
					</div>
				</div>
			</Card.Root>
		{/each}
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Revenue Chart (Layerchart) -->
		<Card.Root class="md:col-span-2">
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Afspraken Overzicht</Card.Title>
					<Card.Description
						>Inkomsten en aantal afspraken over de geselecteerde periode</Card.Description
					>
				</div>
				<Badge variant="outline" class="ml-auto">{getSelectionLabel()}</Badge>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<div class="flex h-75 items-center justify-center">
						<Skeleton class="h-full w-full" />
					</div>
				{:else if chartData.length > 0}
					<Chart.Container config={chartConfig} class="h-75 w-full">
						<AreaChart
							data={chartData}
							x="date"
							xScale={scaleUtc()}
							yDomain={[0, null]}
							yNice
							series={[
								{
									key: 'income',
									label: chartConfig.income.label,
									color: chartConfig.income.color
								},
								{
									key: 'appointmentCount',
									label: chartConfig.appointmentCount.label,
									color: chartConfig.appointmentCount.color
								}
							]}
							props={{
								area: {
									curve: curveBumpX,
									motion: 'tween'
								},
								xAxis: {
									format: (v: Date) => formatChartDate(v, chartMetadata?.groupingStrategy)
								}
							}}
						>
							{#snippet tooltip()}
								<Chart.Tooltip
									labelFormatter={(v: Date) =>
										formatTooltipDate(v, chartMetadata?.groupingStrategy)}
									indicator="line"
								/>
							{/snippet}
						</AreaChart>
					</Chart.Container>
				{:else}
					<div class="text-muted-foreground flex h-75 flex-col items-center justify-center">
						<CircleDollarSign class="mb-4 h-12 w-12" />
						<p class="text-sm">Geen uitgaven data beschikbaar</p>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer>
				<div class="flex w-full items-start gap-2 text-sm">
					<div class="grid gap-2">
						<div class="flex items-center gap-2 leading-none font-medium">
							Overzicht van inkomsten en afspraken <TrendingUpIcon class="size-4" />
						</div>
						<div class="text-muted-foreground flex items-center gap-2 leading-none">
							Afgelopen 12 maanden
						</div>
					</div>
				</div>
			</Card.Footer>
		</Card.Root>

		<!-- Services Breakdown -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Dienstverdeling</Card.Title>
				<Card.Description>Percentage van afgenomen diensten</Card.Description>
			</Card.Header>
			<Card.Content class="flex h-75 items-center justify-center pt-0">
				{#if loading}
					<div class="flex h-full w-full flex-col items-center justify-center gap-4">
						<Skeleton class="h-50 w-50 rounded-full" />
						<div class="flex gap-4">
							<Skeleton class="h-4 w-15 rounded-md" />
							<Skeleton class="h-4 w-20 rounded-md" />
						</div>
					</div>
				{:else if pieChartData.length > 0}
					<div class="w-full">
						<Chart.Container config={pieChartConfig} class="mx-auto aspect-square max-h-62.5">
							<PieChart
								data={pieChartData}
								key="service"
								value="count"
								cRange={pieChartData.map((d) => d.color)}
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
										value={pieChartData.reduce((acc, d) => acc + d.count, 0)}
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
					</div>
				{:else}
					<div class="text-muted-foreground flex h-full flex-col items-center justify-center">
						<Package class="mb-4 h-12 w-12" />
						<p class="text-sm">Geen diensten gevonden</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Recent Activity -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Recente Activiteit</Card.Title>
				<Card.Description>De laatste acties en aankopen</Card.Description>
			</Card.Header>
			<Card.Content class="max-h-75 overflow-y-auto">
				<div class="space-y-4">
					{#if loading}
						{#each Array(3) as _}
							<div class="flex items-center gap-4">
								<Skeleton class="h-12 w-12 rounded-full" />
								<div class="space-y-2">
									<Skeleton class="h-4 w-62.5" />
									<Skeleton class="h-4 w-50" />
								</div>
							</div>
						{/each}
					{:else if purchaseHistory.length > 0}
						{#each purchaseHistory as item, index}
							<div class="flex items-start gap-4">
								<div
									class="bg-muted text-primary flex h-10 w-10 items-center justify-center rounded-full"
								>
									<Receipt class="h-5 w-5" />
								</div>
								<div class="flex-1 space-y-1">
									<div class="flex items-center justify-between">
										<p class="font-medium">{item.service}</p>
										<Badge
											variant={item.status === 'COMPLETED'
												? 'default'
												: item.status === 'CONFIRMED'
													? 'secondary'
													: item.status === 'PENDING'
														? 'outline'
														: 'destructive'}
											class="ml-2"
										>
											{item.status === 'COMPLETED'
												? 'Voltooid'
												: item.status === 'CONFIRMED'
													? 'Bevestigd'
													: item.status === 'PENDING'
														? 'In afwachting'
														: 'Geannuleerd'}
										</Badge>
									</div>
									<div class="flex items-center justify-between">
										<p class="text-muted-foreground text-sm">
											{new Date(item.date).toLocaleDateString('nl-NL', {
												year: 'numeric',
												month: 'long',
												day: 'numeric'
											})}
										</p>
										<p class="font-medium">
											€ {item.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
										</p>
									</div>
								</div>
							</div>
							{#if index < purchaseHistory.length - 1}
								<Separator />
							{/if}
						{/each}
					{:else}
						<div class="text-muted-foreground flex h-50 flex-col items-center justify-center">
							<Receipt class="mb-4 h-12 w-12" />
							<p class="text-sm">Geen recente activiteit</p>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
