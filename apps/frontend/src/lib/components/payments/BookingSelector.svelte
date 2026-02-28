<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index';
	import { Button } from '$lib/components/ui/button/index';
	import { Check, ChevronsUpDown, CheckIcon } from 'lucide-svelte';
	import * as Command from '$lib/components/ui/command/index';
	import { cn } from '$lib/utils';
	import { scale } from 'svelte/transition';
	import type { Booking } from './types';

	interface Props {
		bookings: Booking[];
		selectedBookingId: string;
		onBookingSelect: (bookingId: string) => void;
	}

	let { bookings, selectedBookingId, onBookingSelect }: Props = $props();

	let open = $state(false);
	let selectedBooking = $derived(bookings.find((b) => b.id === selectedBookingId));
</script>

<div class="h-full overflow-auto">
	<div class="m-3">
		<Popover.Root bind:open>
			<Popover.Trigger>
				<Button variant="outline" class="w-75 max-w-full justify-between" role="combobox">
					{selectedBooking?.label || 'Selecteer boeking...'}
					<ChevronsUpDown class="opacity-50" />
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-75 p-0">
				<Command.Root>
					<Command.Input placeholder="Zoek boeking..." />
					<Command.List>
						<Command.Empty>Geen resultaten</Command.Empty>
						<Command.Group>
							{#each bookings as booking}
								<Command.Item
									value={booking.id}
									onSelect={() => {
										onBookingSelect(booking.id);
										open = false;
									}}
								>
									<Check class={cn(selectedBookingId !== booking.id && 'text-transparent')} />
									<span>{booking.label}</span>
									<span class="ml-2 text-xs text-gray-500"
										>{booking.serviceType} • {booking.timeslot}</span
									>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Text-based grouped view -->
	<div class="relative m-3 space-y-6">
		<div class="absolute w-full">
			{#each Object.entries(bookings.reduce((acc, booking) => {
						const timeMatch = booking.timeslot.match(/(\d{2}):(\d{2})/);
						const startTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '14:00';

						if (!acc[startTime]) acc[startTime] = [];
						acc[startTime].push(booking);
						return acc;
					}, {} as Record<string, Booking[]>)).sort( ([a], [b]) => a.localeCompare(b) ) as timeSlotEntry}
				{@const timeSlot = timeSlotEntry[0]}
				{@const timeBookings = timeSlotEntry[1]}
				{@const now = new Date()}
				{@const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`}
				{@const isCurrentTime =
					timeSlot === currentTime ||
					(timeSlot <= currentTime &&
						timeBookings.some((b: Booking) => {
							const endMatch = b.timeslot.match(/- (\d{2}):(\d{2})/);
							const endTime = endMatch ? `${endMatch[1]}:${endMatch[2]}` : '14:30';
							return endTime > currentTime;
						}))}
				<div class="mb-3 space-y-3">
					<!-- Time header -->
					<div class="flex items-center gap-3">
						<h3 class={cn('text-lg font-semibold', isCurrentTime ? 'text-red-600' : '')}>
							{timeSlot}
						</h3>
						<div class="h-px flex-1 bg-gray-300 dark:bg-gray-600"></div>
						<span class="text-sm text-gray-500">
							{timeBookings.length} boeking{timeBookings.length !== 1 ? 'en' : ''}
						</span>
						{#if isCurrentTime}
							<div class="h-2 w-2 animate-pulse rounded-full bg-red-600"></div>
						{/if}
					</div>

					<!-- Bookings cards for this time -->
					<div class="grid gap-3">
						{#each timeBookings as booking}
							{@const isSelected = selectedBookingId === booking.id}
							<button
								class={cn(
									'relative w-full rounded-lg border p-4 text-left shadow-sm transition-all',
									selectedBookingId === booking.id
										? 'border-primary bg-primary/10 ring-primary/20 ring-2'
										: ''
								)}
								onclick={() => onBookingSelect(booking.id)}
							>
								{#if isSelected}
									<div
										in:scale={{ duration: 150, start: 0.1 }}
										class="bg-primary absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
									>
										<div in:scale={{ duration: 250, start: 0.1 }}>
											<CheckIcon class="p-1" />
										</div>
									</div>
								{/if}

								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-center gap-2">
											<div class="truncate text-sm font-semibold">{booking.customer}</div>
											{#if selectedBookingId === booking.id}
												<div class="bg-primary h-2 w-2 flex-shrink-0 rounded-full"></div>
											{/if}
										</div>
										<div class="text-muted-foreground mb-1 text-xs">
											{booking.serviceType}
										</div>
										<div class="text-muted-foreground text-xs">{booking.timeslot}</div>
									</div>
									<div class="ml-4 flex-shrink-0 text-right">
										<div class="text-lg font-bold">
											€ {booking.price.toFixed(2)}
										</div>
										<div class="text-xs text-gray-500">ID: {booking.id}</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}

			{#if bookings.length === 0}
				<div class="py-12 text-center text-gray-500">
					<div class="text-lg font-medium">Geen boekingen vandaag</div>
					<div class="text-sm">Selecteer een andere datum of voeg een nieuwe boeking toe</div>
				</div>
			{/if}
		</div>
	</div>
</div>
