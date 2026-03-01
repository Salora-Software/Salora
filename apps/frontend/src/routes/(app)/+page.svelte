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
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { getLocale, t } from '$lib/translation.js';
	import { cn } from '$lib/utils';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	// Import DateValue and DateRange from bits-ui instead to ensure type compatibility
	import { trpc, trpcQuery } from '$lib/trpc.js';
	import { CalendarDays, CalendarIcon, DollarSign, UserRoundPlus, UsersRound } from 'lucide-svelte';
	import type { DateRange } from 'bits-ui';

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
			label: 'Laatste 7 dagen',
			getValue: () => ({
				start: todayDate.subtract({ days: 6 }),
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
			name: 'Afspraken',
			title:
				stats?.appointments?.current !== undefined ? String(stats.appointments.current) : '+00',
			description: `${stats?.appointments?.change !== undefined ? (stats.appointments.change >= 0 ? '+' : '') + String(stats.appointments.change) : '+00'}% meer dan vorige maand`,
			icon: CalendarDays
		},
		{
			name: 'Omzet',
			title:
				stats?.revenue?.current !== undefined
					? `€ ${Number(stats.revenue.current).toLocaleString('nl-NL')}`
					: '€ 0.000',
			description: `${stats?.revenue?.change !== undefined ? (stats?.revenue.change >= 0 ? '+' : '') + String(stats?.revenue.change) : '+00'}% meer dan vorige maand`,
			icon: DollarSign
		},
		{
			name: 'Klanten',
			title: stats?.customers?.current !== undefined ? String(stats?.customers.current) : '+00',
			description: `${stats?.customers?.change !== undefined ? (stats?.customers.change >= 0 ? '+' : '') + String(stats?.customers.change) : '+00'}% meer dan vorige maand`,
			icon: UsersRound
		},
		{
			name: 'Nieuwe Klanten',
			title:
				stats?.newCustomers?.current !== undefined ? String(stats?.newCustomers.current) : '+00',
			description: `${stats?.newCustomers?.change !== undefined ? (stats?.newCustomers.change >= 0 ? '+' : '') + String(stats?.newCustomers.change) : '+00'}% meer dan vorige maand`,
			icon: UserRoundPlus
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
	let upcomingAppointments = $derived(
		appointments.map((appointment) => ({
			id: appointment.id, // Add the calendar item ID for updates
			date: appointment.localStartTime
				? new Date(appointment.localStartTime).toLocaleDateString('nl-NL', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})
				: 'Onbekende datum',
			time: appointment.localStartTime
				? new Date(appointment.localStartTime).toLocaleTimeString('nl-NL', {
						hour: '2-digit',
						minute: '2-digit'
					})
				: 'Onbekende tijd',
			duration:
				appointment.localEndTime && appointment.localStartTime
					? `${Math.round((new Date(appointment.localEndTime).getTime() - new Date(appointment.localStartTime).getTime()) / (1000 * 60))} min`
					: '30 min',
			assigned: {
				id: appointment.member?.id || '1',
				name: appointment.member?.user?.name || 'Medewerker',
				image: appointment.member?.user?.image || ''
			},
			type: appointment.title || 'Afspraak',
			price: {
				amount: 30, // Default price, could be enhanced later
				currency: 'EUR'
			},
			status: appointment.booking?.status || 'PENDING',
			value: appointment.booking?.status || 'PENDING',
			customer: {
				name: appointment.customer?.name || 'Onbekende klant',
				email: appointment.customer?.email || 'Geen email'
			},
			// Store original appointment data for updates
			originalAppointment: appointment,
			// Loading state for individual appointments
			isUpdating: false
		}))
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
		const originalStatus = appointmentItem.status;

		// Set loading state for this specific appointment
		appointmentItem.isUpdating = true;

		try {
			const originalAppointment = appointmentItem.originalAppointment;

			// Update the calendar item with the new status
			await upsertCalendarItem.mutateAsync({
				id: appointmentItem.id,
				type: 'BOOKING',
				organizationId: activeBranch.id,
				title: originalAppointment.title || 'Afspraak',
				startTime: new Date(originalAppointment.startTime),
				endTime: new Date(originalAppointment.endTime),
				notes: originalAppointment.notes || '',
				status: newStatus
			});

			// Update the local state
			appointmentItem.status = newStatus;
			appointmentItem.value = newStatus;

			// Update the original appointment status for future reference
			if (appointmentItem.originalAppointment.booking) {
				appointmentItem.originalAppointment.booking.status = newStatus;
			}
		} catch (error) {
			console.error('Failed to update appointment status:', error);
			// Revert the status change in case of error
			appointmentItem.status = originalStatus;
			appointmentItem.value = originalStatus;

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
			Hallo {session?.user?.name} <span class="hand text-5xl">👋</span>
		</h1>
		{#if !dashboardStatsQuery.isSuccess}
			<Skeleton class="mt-2 h-6 w-100 rounded-md" />
		{:else}
			<p class="text-muted-foreground mt-2">
				je hebt {dashboardStatsQuery.data?.stats.appointments.current} afspraken en
				{dashboardStatsQuery.data?.stats.customers.current} klanten deze maand.
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
				<Card.Title>Grafieken</Card.Title>
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
				<Card.Title>Klanten</Card.Title>
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

<Card.Root class="mt-8">
	<Card.Header>
		<Card.Title>
			Afspraken
			<span class="text-muted-foreground text-xs"> (Vandaag) </span>
		</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if !upcomingAppointmentsQuery.isSuccess}
			<!-- Skeleton loading for appointments -->
			<div class="space-y-4">
				{#each Array(3) as _, i}
					<div class="flex items-stretch gap-2 py-2">
						<Skeleton class="h-25 w-8 rounded-md" />
						<div class="flex flex-1 items-stretch gap-2 py-2">
							<div
								class="flex min-h-full flex-col justify-between gap-4 xl:flex-row xl:items-center"
							>
								<div class="space-y-2">
									<Skeleton class="h-6 w-30 rounded-md" />
									<Skeleton class="h-4 w-20 rounded-md" />
								</div>
								<div class="space-y-2">
									<Skeleton class="h-4 w-15 rounded-md" />
									<Skeleton class="h-5 w-20 rounded-md" />
								</div>
							</div>
							<div
								class="ml-4 flex min-h-full flex-col justify-between gap-4 xl:flex-row xl:items-center"
							>
								<div class="space-y-2">
									<Skeleton class="h-4 w-25 rounded-md" />
									<Skeleton class="h-4 w-35 rounded-md" />
								</div>
								<div class="space-y-2">
									<Skeleton class="h-4 w-10 rounded-md" />
									<Skeleton class="h-5 w-15 rounded-md" />
								</div>
							</div>
						</div>
						<div
							class="ml-auto flex min-h-full max-w-full flex-col justify-between gap-4 xl:flex-row xl:items-center"
						>
							<div class="space-y-2">
								<Skeleton class="h-4 w-25 rounded-md" />
								<Skeleton class="h-4 w-20 rounded-md" />
							</div>
							<div>
								<Skeleton class="h-9 w-37.5 rounded-md" />
							</div>
						</div>
					</div>
					{#if i < 2}
						<Separator />
					{/if}
				{/each}
			</div>
		{:else if upcomingAppointments.length > 0}
			{#each upcomingAppointments as item, i}
				<Separator />
				<div
					class="afspraak-card hover:bg-sidebar-accent border-muted flex flex-col items-stretch gap-2 overflow-x-auto rounded-lg border py-2 transition-colors sm:flex-row"
				>
					<div class="bg-secondary my-auto h-8 w-full shrink-0 rounded-md sm:h-30 sm:w-8"></div>
					<div class="mobile-zigzag flex flex-1 flex-col items-stretch gap-2 py-2 sm:flex-row">
						<div
							class="mobile-zigzag-item flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-start sm:gap-4"
						>
							<div
								class="bg-secondary text-secondary-foreground flex flex-wrap items-center gap-2 rounded-md px-2 font-semibold"
							>
								<p>{item.date}</p>
								<p>{item.time}</p>
							</div>
							<div class="  font-semibold">
								<p class="text-muted-foreground">Van:</p>
								<p class="text-md">{item.duration}</p>
							</div>
						</div>
						<div
							class="mobile-zigzag-item flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-start sm:gap-4"
						>
							<div class="font-semibold">
								<div class="flex items-center gap-1">
									<p class="text-muted-foreground">Klant:</p>
									<p class="text-foreground">{item.customer?.name || 'Onbekende klant'}</p>
								</div>
								<p class="text-muted-foreground text-sm">{item.customer?.email || 'Geen email'}</p>
							</div>
							<div class="font-semibold">
								<p class="text-muted-foreground">Prijs:</p>
								<p class="text-md">€ {item.price.amount}</p>
							</div>
						</div>
						<div
							class="right-bar mobile-zigzag-item flex w-full min-w-40 flex-col items-end justify-between gap-2 sm:ml-auto sm:w-auto"
						>
							<div class="w-full text-right font-semibold">
								<p class="text-muted-foreground">Toegewezen aan:</p>
								<p class="text-foreground">{item.assigned.name}</p>
							</div>
							<div class="w-full min-w-30">
								<Select.Root
									type="single"
									disabled={item.isUpdating}
									onValueChange={(value) => {
										if (value && value !== item.status) {
											updateAppointmentStatus(item, value);
										}
									}}
								>
									<Select.Trigger class="w-full min-w-25" disabled={item.isUpdating}>
										<span class="text-foreground">
											{item.isUpdating
												? 'Bezig met bijwerken...'
												: t.database.enums.bookingStatus[
														item.status as keyof typeof t.database.enums.bookingStatus
													]}
										</span>
									</Select.Trigger>
									<Select.Content>
										{#each statusTypes as status}
											<Select.Item value={status}>
												{t.database.enums.bookingStatus[
													status as keyof typeof t.database.enums.bookingStatus
												]}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</div>
				</div>
			{/each}
			<Separator />
		{:else}
			<div class="flex h-40 flex-col items-center justify-center">
				<CalendarDays class="text-muted-foreground mb-4 h-12 w-12" />
				<p class="text-foreground text-lg font-medium">Geen afspraken voor vandaag</p>
				<p class="text-muted-foreground max-w-md text-center text-sm">
					Er zijn momenteel geen afspraken gepland voor vandaag. Probeer het later opnieuw.
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

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
