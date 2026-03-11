<script lang="ts">
	import InfoCard from '$lib/components/InfoCard.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import DashboardChart from '$lib/components/DashboardChart.svelte';
	import CustomerDonutChart from '$lib/components/CustomerDonutChart.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index';
	import { cn } from '$lib/utils';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	// Import DateValue and DateRange from bits-ui instead to ensure type compatibility
	import { trpc, trpcQuery } from '$lib/trpc.js';
	import { CalendarDays, CalendarIcon, DollarSign, UserRoundPlus, UsersRound } from 'lucide-svelte';
	import type { DateRange } from 'bits-ui';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages.js';
	import AppointmentOverview from '$lib/components/AppointmentOverview.svelte';

	// Set default date range to last 30 days
	const todayDate = today(getLocalTimeZone());
	const thirtyDaysAgo = todayDate.subtract({ days: 29 }); // 29 days ago + today = 30 days total

	const locale = getLocale();

	let selectedDates: DateRange = $state({
		start: thirtyDaysAgo,
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
			label: m['general.last_days']({ days: 7 }),
			getValue: () => ({
				start: todayDate.subtract({ days: 6 }),
				end: todayDate
			})
		},
		{
			label: m['general.last_days']({ days: 30 }),
			getValue: () => ({
				start: todayDate.subtract({ days: 29 }),
				end: todayDate
			})
		},
		{
			label: m['general.last_months']({ months: 3 }),
			getValue: () => ({
				start: todayDate.subtract({ months: 3 }),
				end: todayDate
			})
		},
		{
			label: m['general.last_months']({ months: 6 }),
			getValue: () => ({
				start: todayDate.subtract({ months: 6 }),
				end: todayDate
			})
		},
		{
			label: m['general.last_years']({ years: 1 }),
			getValue: () => ({
				start: todayDate.subtract({ years: 1 }),
				end: todayDate
			})
		},
		{
			label: m['general.all_time'](),
			getValue: () => {
				let startDate = todayDate.subtract({ years: 10 }); // Fallback

				if (activeBranch?.createdAt) {
					try {
						const branchCreatedAt = new Date(activeBranch.createdAt);
						// Convert to CalendarDate using the same timezone
						const createdAtCalendarDate = today(getLocalTimeZone()).set({
							year: branchCreatedAt.getFullYear(),
							month: branchCreatedAt.getMonth() + 1, // Month is 0-indexed in JS Date
							day: branchCreatedAt.getDate()
						});
						startDate = createdAtCalendarDate;
					} catch (error) {
						console.warn('Could not parse branch createdAt date, using fallback');
					}
				}

				return {
					start: startDate,
					end: todayDate
				};
			}
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
	let { data } = $props();
	let { session } = $derived(data);
	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	// Chart visibility state
	let chartVisibility = $state({
		bookings: true,
		revenue: true,
		customers: true,
		newCustomers: true
	});

	const statusTypes = ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'];

	let activeBranch = $state(data.branchesState.getActiveBranch());
	let dashboardStatsQuery = $derived(
		trpcQuery.v2.authenticated.dashboard.getDashboardStats.createQuery(
			{
				organizationId: activeBranch?.id,
				startDate: selectedDates.start?.toString(),
				endDate: selectedDates.end?.toString()
			},
			{
				enabled: !!activeBranch
			}
		)
	);
	const stats = $derived(dashboardStatsQuery.data?.stats);
	let cards = $derived([
		{
			name: m['general.appointments'](),
			title:
				stats?.appointments?.current !== undefined ? String(stats.appointments.current) : '+00',
			// description: `${stats?.appointments?.change !== undefined ? (stats.appointments.change >= 0 ? '+' : '') + String(stats.appointments.change) : '+00'}% meer dan vorige maand`,
			description: m['dashboard.percentage-change']({
				percentage: Number(stats?.appointments?.change ?? 0),
				period: 'maand',
				trend:
					(stats?.appointments?.change ?? 0) === 0
						? 'flat'
						: (stats?.appointments?.change ?? 0) > 0
							? 'up'
							: 'down'
			}),
			icon: CalendarDays
		},
		{
			name: m['general.revenue'](),
			title:
				stats?.revenue?.current !== undefined
					? `€ ${Number(stats.revenue.current).toLocaleString('nl-NL')}`
					: '€ 0.000',
			description: m['dashboard.percentage-change']({
				percentage: Number(stats?.revenue?.change ?? 0),
				period: 'maand',
				trend:
					(stats?.revenue?.change ?? 0) === 0
						? 'flat'
						: (stats?.revenue?.change ?? 0) > 0
							? 'up'
							: 'down'
			})
		},
		{
			name: m['general.customers'](),
			title: stats?.customers?.current !== undefined ? String(stats?.customers.current) : '+00',
			description: m['dashboard.percentage-change']({
				percentage: Number(stats?.customers?.change ?? 0),
				period: 'maand',
				trend:
					(stats?.customers?.change ?? 0) === 0
						? 'flat'
						: (stats?.customers?.change ?? 0) > 0
							? 'up'
							: 'down'
			})
		},
		{
			name: m['general.new-customers'](),
			title:
				stats?.newCustomers?.current !== undefined ? String(stats?.newCustomers.current) : '+00',
			description: m['dashboard.percentage-change']({
				percentage: Number(stats?.newCustomers?.change ?? 0),
				period: 'maand',
				trend:
					(stats?.newCustomers?.change ?? 0) === 0
						? 'flat'
						: (stats?.newCustomers?.change ?? 0) > 0
							? 'up'
							: 'down'
			})
		}
	]);

	const chart = $derived(dashboardStatsQuery.data?.chartData);
	let chartData = $derived(chart?.points ?? []);

	let pieChartData = $derived([
		{
			label: 'Nieuw',
			value: chart?.customerTypes.new ?? 0,
			fill: '#3b82f6'
		},
		{
			label: 'Terugkerend',
			value: chart?.customerTypes.returning ?? 0,
			fill: '#22c55e'
		}
	]);

	const chartConfig = {
		bookings: {
			label: 'Afspraken',
			color: '#3b82f6'
		},
		revenue: {
			label: 'Omzet',
			color: '#22c55e'
		},
		customers: {
			label: 'Klanten',
			color: '#f97316'
		},
		newCustomers: {
			label: 'Nieuwe Klanten',
			color: '#a855f7'
		},
		new: {
			label: 'Nieuw',
			color: '#3b82f6'
		},
		returning: {
			label: 'Terugkerend',
			color: '#22c55e'
		}
	} satisfies Chart.ChartConfig;
	const upsertCalendarItem = trpcQuery.v1.authenticated.calendar.upsertCalendarItem.createMutation({
		mutationKey: ['upsertCalendarItem'],
		onSettled: () => {
			data.queryClient.invalidateQueries({
				queryKey: ['getUpcomingAppointments', activeBranch?.id]
			});
		}
	});

	let upcomingAppointmentsQuery = $derived(
		trpcQuery.v1.authenticated.dashboard.getUpcomingAppointments.createQuery(
			{
				organizationId: activeBranch?.id
			},
			{
				refetchInterval: 8000,
				queryKey: ['getUpcomingAppointments', activeBranch?.id],
				enabled: !!activeBranch
				// Only refetch if the active branch is set
			}
		)
	);
	const appointments = $derived(
		upcomingAppointmentsQuery.data?.appointments.sort((a, b) => {
			const dateA = new Date(a.localStartTime || a.startTime);
			const dateB = new Date(b.localStartTime || b.startTime);

			// First sort by date
			const dateDiff = dateA.getTime() - dateB.getTime();
			if (dateDiff !== 0) return dateDiff;

			// If dates are equal, sort by customer name (case-insensitive)
			const nameA = (a.customer?.name || '').toLowerCase();
			const nameB = (b.customer?.name || '').toLowerCase();
			return nameA.localeCompare(nameB);
		}) || []
	);

	data.branchesState.onBranchChange(async (branch) => {
		activeBranch = branch;
	});
	$effect(() => {
		// Only update selectedDates from calendar if both start and end are defined
		// and the calendar range is different from the current selection
		if (
			selectedDatesRange.start &&
			selectedDatesRange.end &&
			(selectedDatesRange.start !== selectedDates.start ||
				selectedDatesRange.end !== selectedDates.end)
		) {
			console.log('updated from calendar');
			selectedDates.start = selectedDatesRange.start;
			selectedDates.end = selectedDatesRange.end;
			selectedDatesRange.open = false;
		}
	});

	// Function to update appointment status
	async function updateAppointmentStatus(appointmentItem: any, newStatus: string) {
		if (!activeBranch) return;

		// Store original status for rollback
		const originalStatus = appointmentItem.booking?.status || 'PENDING';

		// Set loading state for this specific appointment
		appointmentItem.isUpdating = true;

		try {
			// Update the calendar item with the new status
			await upsertCalendarItem.mutateAsync({
				id: appointmentItem.id,
				type: 'BOOKING',
				organizationId: activeBranch.id,
				title: appointmentItem.title || 'Afspraak',
				startTime: new Date(appointmentItem.startTime),
				endTime: new Date(appointmentItem.endTime),
				notes: appointmentItem.notes || '',
				status: newStatus
			});

			// Update the original appointment booking status for future reference
			if (appointmentItem.booking) {
				appointmentItem.booking.status = newStatus;
			}
		} catch (error) {
			console.error('Failed to update appointment status:', error);
			// Revert the status change in case of error
			if (appointmentItem.booking) {
				appointmentItem.booking.status = originalStatus;
			}

			// Show error message to user (you can implement a toast notification here)
			alert('Er ging iets mis bij het bijwerken van de afspraak. Probeer het opnieuw.');
		} finally {
			// Remove loading state
			appointmentItem.isUpdating = false;
		}
	}
</script>

<div class="flex flex-col items-start justify-between gap-2 md:flex-row md:items-end">
	<div>
		<h1 class="mt-5 text-3xl font-semibold">
			{m['dashboard.hello']({ name: session?.user?.name || 'Gast' })}
			<span class="hand text-5xl">👋</span>
		</h1>
		{#if !dashboardStatsQuery.isSuccess}
			<Skeleton class="mt-2 h-6 w-100 rounded-md" />
		{:else}
			<p class="text-muted-foreground mt-2">
				{m['dashboard.summary']({
					appointments: dashboardStatsQuery.data?.stats.appointments.current,
					customers: dashboardStatsQuery.data?.stats.customers.current
				})}
				{#if selectedDates.start && selectedDates.end}
					({df.format(selectedDates.start.toDate(getLocalTimeZone()))} - {df.format(
						selectedDates.end.toDate(getLocalTimeZone())
					)})
				{/if}
			</p>
		{/if}
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
<div class="mt-4 flex flex-wrap gap-4">
	{#each cards as item}
		<InfoCard
			{...item}
			loading={!dashboardStatsQuery.isSuccess}
			class="w-full grow md:w-1/4 lg:w-1/5"
		/>
	{/each}
</div>

<div class="grid grid-cols-3 gap-4">
	<div class="col-span-3 h-full lg:col-span-2">
		<Card.Root class="mt-4 h-full overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>
					{m['dashboard.appointment-trends']()}
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex h-full items-center justify-center px-2 pt-0 pb-8">
				<div class="w-full">
					{#if !dashboardStatsQuery.isSuccess}
						<Skeleton class="h-[350px] w-full" />
					{:else}
						<DashboardChart {chartData} {chartVisibility} />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	<div class="col-span-3 h-full min-h-87.5 lg:col-span-1">
		<Card.Root class="mt-4 h-full overflow-hidden">
			<Card.Header>
				<Card.Title>
					{m['dashboard.customer-types']()}
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex h-full items-center justify-center pt-0">
				{#if !dashboardStatsQuery.isSuccess}
					<div class="flex h-full w-full flex-col items-center justify-center gap-4">
						<Skeleton class="h-50 w-50 rounded-full" />
						<div class="flex gap-4">
							<Skeleton class="h-4 w-15 rounded-md" />
							<Skeleton class="h-4 w-20 rounded-md" />
						</div>
					</div>
				{:else}
					<div class="w-full px-4 pb-4">
						<CustomerDonutChart data={pieChartData} />
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
<AppointmentOverview
	{appointments}
	isLoading={!upcomingAppointmentsQuery.isSuccess}
	onStatusChange={updateAppointmentStatus}
/>

<style>
	@keyframes wave {
		0% {
			transform: rotate(0deg);
		}
		5% {
			transform: rotate(14deg);
		}
		10% {
			transform: rotate(-8deg);
		}
		15% {
			transform: rotate(14deg);
		}
		20% {
			transform: rotate(-4deg);
		}
		25% {
			transform: rotate(10deg);
		}
		30% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	.hand {
		display: inline-block;
		animation: wave 8s infinite;
		transform-origin: 70% 70%;
	}

	/* Mobile-friendly afspraken card tweaks */
	@media (max-width: 640px) {
		.afspraak-card {
			flex-direction: column !important;
			align-items: stretch !important;
			gap: 0.5rem !important;
			padding: 0.75rem 0.5rem !important;
			border-radius: 0.75rem !important;
			border-width: 1px !important;
			border-color: var(--color-muted, #e5e7eb) !important;
			overflow-x: auto !important;
		}
		.afspraak-card > div {
			min-width: 0;
		}
		.afspraak-card .flex-row {
			flex-direction: row !important;
			gap: 0.5rem !important;
			align-items: center !important;
		}
		.afspraak-card .flex-col {
			flex-direction: column !important;
			gap: 0.5rem !important;
			align-items: flex-start !important;
		}
		.mobile-zigzag .mobile-zigzag-item {
			width: 100%;
		}
		.mobile-zigzag .mobile-zigzag-item:nth-child(odd) {
			margin-left: 0 !important;
			margin-right: auto !important;
		}
		.mobile-zigzag .mobile-zigzag-item:nth-child(even) {
			margin-left: auto !important;
			margin-right: 0 !important;
		}
	}
</style>
