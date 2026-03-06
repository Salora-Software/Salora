<script lang="ts">
	import * as Card from '$lib/components/ui/card/index';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { t } from '$lib/translation.js';
	import { CalendarDays, Clock, User, Banknote, CalendarCheck } from 'lucide-svelte';
	import type { AppointmentItem as TRPCAppointmentItem } from '$lib/trpc';

	// Extend the TRPC appointment type with local state flags
	type AppointmentItem = TRPCAppointmentItem & { isUpdating?: boolean };

	let {
		appointments,
		isLoading,
		onStatusChange
	}: {
		appointments: AppointmentItem[];
		isLoading: boolean;
		onStatusChange: (appointment: AppointmentItem, newStatus: string) => Promise<void>;
	} = $props();

	const statusTypes = ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'];

	const statusConfig: Record<string, { color: string; bg: string }> = {
		CONFIRMED: {
			color: 'text-emerald-700 dark:text-emerald-400',
			bg: 'bg-emerald-50 dark:bg-emerald-950/40'
		},
		COMPLETED: {
			color: 'text-blue-700 dark:text-blue-400',
			bg: 'bg-blue-50 dark:bg-blue-950/40'
		},
		CANCELLED: {
			color: 'text-red-700 dark:text-red-400',
			bg: 'bg-red-50 dark:bg-red-950/40'
		},
		PENDING: {
			color: 'text-amber-700 dark:text-amber-400',
			bg: 'bg-amber-50 dark:bg-amber-950/40'
		}
	};

	function getStatusConfig(status: string) {
		return (
			statusConfig[status] ?? {
				color: 'text-muted-foreground',
				bg: 'bg-muted/40',
				border: 'border-muted-foreground/30',
				dot: 'bg-muted-foreground'
			}
		);
	}

	function getInitials(name: string): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((n) => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	function formatDate(date: string | Date): string {
		if (!date) return '';
		return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(
			new Date(date)
		);
	}

	function formatTime(date: string | Date): string {
		if (!date) return '';
		return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(
			new Date(date)
		);
	}
</script>

<Card.Root class="mt-8">
	<Card.Header>
		<div class="flex items-center gap-2">
			<CalendarCheck class="text-muted-foreground h-5 w-5" />
			<Card.Title class="text-lg">
				Afspraken
				<span class="text-muted-foreground ml-1 text-xs font-normal">(Vandaag)</span>
			</Card.Title>
		</div>
	</Card.Header>

	<Card.Content class="px-4 pb-4 sm:px-6">
		{#if isLoading}
			<!-- Skeleton loading -->
			<div class="flex flex-col">
				{#each Array(3) as _, i}
					{#if i > 0}
						<Separator class="my-2" />
					{/if}
					<div class="flex items-center gap-4 py-3">
						<Skeleton class="h-10 w-10 shrink-0 rounded-full" />
						<div class="min-w-0 flex-1 space-y-2">
							<Skeleton class="h-4 w-36 rounded-md" />
							<Skeleton class="h-3 w-24 rounded-md" />
						</div>
						<div class="hidden w-40 space-y-2 sm:block">
							<Skeleton class="h-3 w-20 rounded-md" />
							<Skeleton class="h-3 w-16 rounded-md" />
						</div>
						<div class="hidden w-32 space-y-2 xl:block">
							<Skeleton class="h-3 w-20 rounded-md" />
							<Skeleton class="h-3 w-16 rounded-md" />
						</div>
						<div class="hidden w-24 space-y-2 md:block">
							<Skeleton class="h-3 w-12 rounded-md" />
							<Skeleton class="h-3 w-8 rounded-md" />
						</div>
						<Skeleton class="ml-auto h-8 w-32 shrink-0 rounded-lg" />
					</div>
				{/each}
			</div>
		{:else if appointments.length > 0}
			<div class="flex flex-col">
				{#each appointments as item, index (item.id)}
					{@const currentStatus = item.booking?.status || 'PENDING'}
					{@const sc = getStatusConfig(currentStatus)}

					{#if index > 0}
						<Separator class="my-2" />
					{/if}

					<div class="group flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
						<!-- Customer avatar -->
						<div
							class="bg-secondary text-secondary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
						>
							{getInitials(item.customer?.name ?? 'Onbekend')}
						</div>

						<!-- Customer info -->
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<p class="truncate text-sm font-medium">
									{item.customer?.name || 'Onbekende klant'}
								</p>
								<span
									class="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
								>
									{item.booking?.service.name || 'Afspraak'}
								</span>
							</div>
							<p class="text-muted-foreground truncate text-xs">
								{item.customer?.email || 'Geen email'}
							</p>
						</div>

						<!-- Date & time -->
						<div class="flex items-center gap-3 sm:w-40 sm:flex-col sm:items-start sm:gap-0.5">
							<div class="flex items-center gap-1">
								<CalendarDays class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
								<span class="text-sm">{formatDate(item.localStartTime || item.startTime)}</span>
							</div>
							<div class="flex items-center gap-1">
								<Clock class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
								<span class="text-muted-foreground text-xs"
									>{formatTime(item.localStartTime || item.startTime)} · {item.booking?.duration
										? `${item.booking.duration} min`
										: '-'}</span
								>
							</div>
						</div>

						<!-- Assigned staff -->
						<div
							class="hidden items-center gap-1.5 xl:flex xl:w-32 xl:flex-col xl:items-start xl:gap-0.5"
						>
							<div class="flex items-center gap-1">
								<User class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
								<span class="text-muted-foreground text-xs">Toegewezen aan</span>
							</div>
							<span class="text-sm">{item.member?.user?.name || '-'}</span>
						</div>

						<!-- Status select -->
						<div
							class="flex shrink-0 items-center justify-between sm:flex-col sm:items-end sm:justify-center sm:gap-1.5"
						>
							<Select.Root
								type="single"
								disabled={item.isUpdating}
								onValueChange={(value) => {
									if (value && value !== currentStatus) {
										onStatusChange(item, value);
									}
								}}
							>
								<Select.Trigger
									class="h-8 w-full min-w-[9rem] text-xs sm:w-auto"
									disabled={item.isUpdating}
								>
									<span class="text-foreground">
										{item.isUpdating
											? 'Bijwerken...'
											: t.database.enums.bookingStatus[
													currentStatus as keyof typeof t.database.enums.bookingStatus
												] || 'Status wijzigen'}
									</span>
								</Select.Trigger>
								<Select.Content>
									{#each statusTypes as status}
										<Select.Item value={status} class="text-sm">
											<span class="flex items-center gap-2">
												{t.database.enums.bookingStatus[
													status as keyof typeof t.database.enums.bookingStatus
												]}
											</span>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex h-44 flex-col items-center justify-center gap-2 text-center">
				<div class="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
					<CalendarDays class="text-muted-foreground h-6 w-6" />
				</div>
				<p class="text-foreground font-medium">Geen afspraken voor vandaag</p>
				<p class="text-muted-foreground max-w-xs text-sm">
					Er zijn momenteel geen afspraken gepland voor vandaag. Probeer het later opnieuw.
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
