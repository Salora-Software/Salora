<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { Booking } from './types';
	import type { Customer } from '$lib/types';
	import Button from '../ui/button/button.svelte';

	// Mock customer data - replace with actual data source
	const customers: Customer[] = [
		{
			id: 'c1',
			name: 'Jan Jansen',
			email: 'jan@example.com',
			phone: '+31612345678',
			createdAt: new Date('2024-01-15'),
			statistics: {
				bookingCount: 12,
				lastBookingDate: new Date('2024-08-15'),
				reliabilityRating: 'Hoog',
				averageBookingValue: 45.5
			}
		},
		{
			id: 'c2',
			name: 'Maria Santos',
			email: 'maria@example.com',
			phone: '+31687654321',
			createdAt: new Date('2024-03-20'),
			statistics: {
				bookingCount: 8,
				lastBookingDate: new Date('2024-08-10'),
				reliabilityRating: 'Gemiddeld',
				averageBookingValue: 62.75
			}
		},
		{
			id: 'c3',
			name: 'Ahmed Hassan',
			email: 'ahmed@example.com',
			phone: '+31655443322',
			createdAt: new Date('2024-02-10'),
			statistics: {
				bookingCount: 15,
				lastBookingDate: new Date('2024-08-20'),
				reliabilityRating: 'Hoog',
				averageBookingValue: 38.9
			}
		}
	];

	// Mock customer bookings - replace with actual data source
	const mockCustomerBookings: Record<string, Booking[]> = {
		c1: [
			{
				id: 'b1',
				label: 'Boeking #1 - Jan Jansen',
				price: 50.0,
				customer: 'Jan Jansen',
				serviceType: 'Knippen',
				timeslot: '14:00 - 14:30'
			},
			{
				id: 'b7',
				label: 'Boeking #7 - Jan Jansen',
				price: 45.0,
				customer: 'Jan Jansen',
				serviceType: 'Knippen + Baard',
				timeslot: '10:00 - 10:45'
			}
		],
		c2: [
			{
				id: 'b3',
				label: 'Boeking #3 - Maria Santos',
				price: 35.0,
				customer: 'Maria Santos',
				serviceType: 'Föhnen',
				timeslot: '14:00 - 14:25'
			}
		],
		c3: [
			{
				id: 'b4',
				label: 'Boeking #4 - Ahmed Hassan',
				price: 60.0,
				customer: 'Ahmed Hassan',
				serviceType: 'Knippen + Baard',
				timeslot: '15:30 - 16:00'
			}
		]
	};

	interface Props {
		open: boolean;
		onClose: () => void;
		onCustomerSelect?: (customer: Customer) => void;
		onBookingSelect?: (booking: Booking) => void;
	}

	let { open, onClose, onCustomerSelect, onBookingSelect }: Props = $props();

	let step = $state<'search' | 'customer' | 'bookings'>('search');
	let searchQuery = $state('');
	let selectedCustomer = $state<Customer | null>(null);
	let selectedBooking = $state<Booking | null>(null);

	const dispatch = createEventDispatcher<{
		customerSelected: { customer: Customer };
		bookingSelected: { booking: Booking };
		close: void;
	}>();

	// Filtered customers based on search
	const filteredCustomers = $derived(
		searchQuery.trim() === ''
			? customers
			: customers.filter(
					(customer) =>
						customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
						(customer.phone && customer.phone.includes(searchQuery))
				)
	);

	// Customer bookings
	const customerBookings = $derived(
		selectedCustomer ? mockCustomerBookings[selectedCustomer.id] || [] : []
	);

	function handleCustomerSelect(customer: Customer) {
		selectedCustomer = customer;
		step = 'customer';
	}

	function handleViewBookings() {
		if (selectedCustomer) {
			step = 'bookings';
		}
	}

	function handleBookingSelect(booking: Booking) {
		selectedBooking = booking;
		onBookingSelect?.(booking);
		dispatch('bookingSelected', { booking });
		handleClose();
	}

	function handleCustomerConfirm() {
		if (selectedCustomer) {
			onCustomerSelect?.(selectedCustomer);
			dispatch('customerSelected', { customer: selectedCustomer });
			handleClose();
		}
	}

	function handleClose() {
		step = 'search';
		searchQuery = '';
		selectedCustomer = null;
		selectedBooking = null;
		onClose();
		dispatch('close');
	}

	function goBack() {
		if (step === 'bookings') {
			step = 'customer';
		} else if (step === 'customer') {
			step = 'search';
			selectedCustomer = null;
		}
	}

	function getReliabilityColor(rating: string) {
		switch (rating) {
			case 'Hoog':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'Gemiddeld':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'Laag':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}
</script>

{#if open}
	<Dialog.Root {open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
		<Dialog.Content class="max-h-[80vh] max-w-2xl">
			<Dialog.Header>
				<div class="flex items-center gap-3">
					{#if step !== 'search'}
						<button
							onclick={goBack}
							class="rounded-md p-1 transition-colors hover:bg-gray-100"
							aria-label="Ga terug"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						</button>
					{/if}
					<Dialog.Title class="text-lg font-semibold text-gray-900">
						{#if step === 'search'}
							Klant selecteren
						{:else if step === 'customer'}
							Klantgegevens
						{:else if step === 'bookings'}
							Boekingen van {selectedCustomer?.name}
						{/if}
					</Dialog.Title>
				</div>
			</Dialog.Header>

			<!-- Content -->
			<div class="max-h-[60vh] overflow-y-auto">
				{#if step === 'search'}
					<!-- Search Step -->
					<div class="space-y-4">
						<!-- Search Input -->
						<div class="relative">
							<svg
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							<input
								bind:value={searchQuery}
								type="text"
								placeholder="Zoek op naam, email of telefoonnummer..."
								class="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<!-- Customer List -->
						<div class="space-y-2">
							{#each filteredCustomers as customer (customer.id)}
								<button
									onclick={() => handleCustomerSelect(customer)}
									class="w-full rounded-lg border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
								>
									<div class="flex items-center justify-between">
										<div class="flex-1">
											<h3 class="font-medium text-gray-900">{customer.name}</h3>
											<p class="text-sm text-gray-500">{customer.email}</p>
											{#if customer.phone}
												<p class="text-sm text-gray-500">{customer.phone}</p>
											{/if}
										</div>
										{#if customer.statistics}
											<div class="text-right">
												<div
													class={cn(
														'inline-block rounded-full border px-2 py-1 text-xs font-medium',
														getReliabilityColor(customer.statistics.reliabilityRating)
													)}
												>
													{customer.statistics.reliabilityRating}
												</div>
												<p class="mt-1 text-xs text-gray-500">
													{customer.statistics.bookingCount} boekingen
												</p>
											</div>
										{/if}
									</div>
								</button>
							{:else}
								<div class="text-center py-8 text-gray-500">
									<svg
										class="w-12 h-12 mx-auto mb-4 text-gray-300"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
									{searchQuery
										? 'Geen klanten gevonden'
										: 'Voer een zoekterm in om klanten te vinden'}
								</div>
							{/each}
						</div>
					</div>
				{:else if step === 'customer' && selectedCustomer}
					<!-- Customer Details Step -->
					<div class="space-y-6">
						<!-- Customer Info -->
						<div class="rounded-lg bg-gray-50 p-4">
							<h3 class="mb-3 font-semibold text-gray-900">{selectedCustomer.name}</h3>
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span class="text-gray-500">Email:</span>
									<p class="font-medium">{selectedCustomer.email}</p>
								</div>
								{#if selectedCustomer.phone}
									<div>
										<span class="text-gray-500">Telefoon:</span>
										<p class="font-medium">{selectedCustomer.phone}</p>
									</div>
								{/if}
								{#if selectedCustomer.statistics}
									<div>
										<span class="text-gray-500">Betrouwbaarheid:</span>
										<br />
										<div
											class={cn(
												'mt-1 inline-block rounded-full border px-2 py-1 text-xs font-medium',
												getReliabilityColor(selectedCustomer.statistics.reliabilityRating)
											)}
										>
											{selectedCustomer.statistics.reliabilityRating}
										</div>
									</div>
									<div>
										<span class="text-gray-500">Totaal boekingen:</span>
										<p class="font-medium">{selectedCustomer.statistics.bookingCount}</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="space-y-3">
							<Button onclick={handleViewBookings} class="w-full font-medium">
								Bekijk boekingen ({customerBookings.length})
							</Button>
							<Button onclick={handleCustomerConfirm} class="w-full font-medium" variant="outline">
								Selecteer deze klant
							</Button>
						</div>
					</div>
				{:else if step === 'bookings' && selectedCustomer}
					<!-- Bookings Step -->
					<div class="space-y-4">
						{#if customerBookings.length > 0}
							<div class="space-y-3">
								{#each customerBookings as booking (booking.id)}
									<button
										onclick={() => handleBookingSelect(booking)}
										class="w-full rounded-lg border border-gray-200 p-4 text-left transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
										transition:slide={{ duration: 200 }}
									>
										<div class="flex items-center justify-between">
											<div class="flex-1">
												<h3 class="font-medium text-gray-900">{booking.serviceType}</h3>
												<p class="text-sm text-gray-500">{booking.timeslot}</p>
											</div>
											<div class="text-right">
												<p class="font-semibold text-gray-900">€ {booking.price.toFixed(2)}</p>
											</div>
										</div>
									</button>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center text-gray-500">
								<svg
									class="mx-auto mb-4 h-12 w-12 text-gray-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h4z"
									/>
								</svg>
								<p>Geen boekingen gevonden voor deze klant</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
