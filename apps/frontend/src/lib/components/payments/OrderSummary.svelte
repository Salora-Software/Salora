<script lang="ts">
	import { cn } from '$lib/utils';
	import { discountedPrice } from './utils';
	import CustomerWizard from './CustomerWizard.svelte';
	import type { Booking, Service } from './types';
	import type { Customer } from '$lib/types';

	interface Props {
		tabValue: 'booking' | 'service';
		selectedBooking?: Booking;
		selectedServices: Service[];
		serviceQuantities: Record<string, number>;
		discountValue: number | null;
		discountType: 'euro' | 'percent';
		onCustomerSelect?: (customer: Customer | null) => void;
		onBookingSelect?: (booking: Booking) => void;
	}

	let {
		tabValue,
		selectedBooking,
		selectedServices,
		serviceQuantities,
		discountValue,
		discountType,
		onCustomerSelect,
		onBookingSelect
	}: Props = $props();

	let isWizardOpen = $state(false);
	let selectedCustomer = $state<Customer | null>(null);

	let baseServicePrice = $derived(
		selectedServices.reduce((sum, service) => sum + service.price, 0)
	);
	let totalServicePrice = $derived(
		selectedServices.reduce((sum, service) => {
			const quantity = serviceQuantities[service.id] || 1;
			return sum + service.price * quantity;
		}, 0)
	);

	function openWizard() {
		isWizardOpen = true;
	}

	function closeWizard() {
		isWizardOpen = false;
	}

	function removeCustomer() {
		selectedCustomer = null;
		onCustomerSelect?.(null);
	}

	function handleCustomerSelect(customer: Customer) {
		selectedCustomer = customer;
		onCustomerSelect?.(customer);
	}

	function handleBookingSelect(booking: Booking) {
		onBookingSelect?.(booking);
	}
</script>

<div class={cn('grid gap-4', tabValue !== 'service' ? 'grid-cols-1' : 'grid-cols-[1fr_2fr]')}>
	{#if tabValue === 'service'}
		{#if selectedCustomer}
			<!-- Selected Customer Display -->
			<button
				onclick={removeCustomer}
				class="border-border bg-muted/40 hover:bg-muted/80 w-full cursor-pointer rounded-lg border p-4 text-center transition"
			>
				<div class="flex flex-col items-center justify-center">
					<h3 class="font-semibold text-gray-900">{selectedCustomer.name}</h3>
					<p class="text-sm text-gray-500">{selectedCustomer.email}</p>
					{#if selectedCustomer.phone}
						<p class="text-sm text-gray-500">{selectedCustomer.phone}</p>
					{/if}
					<p class="mt-2 text-xs text-gray-400">Klik om te verwijderen</p>
				</div>
			</button>
		{:else}
			<!-- Add Customer Button -->
			<button
				onclick={openWizard}
				class="border-border bg-muted/40 hover:bg-muted/80 flex w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed py-10 transition"
			>
				<span class="text-muted-foreground mb-2 text-3xl">+</span>
				<span class="text-muted-foreground font-semibold">Klant toevoegen</span>
			</button>
		{/if}
	{/if}

	<!-- Order Summary for Bookings -->
	{#if selectedBooking && tabValue === 'booking'}
		<div class="border-border bg-muted/40 rounded-lg border p-4">
			<div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
				<span class="text-muted-foreground font-medium">Klant:</span>
				<span class="text-foreground">{selectedBooking.customer}</span>
				<span class="text-muted-foreground font-medium">Service:</span>
				<span class="text-foreground">{selectedBooking.serviceType}</span>
				<span class="text-muted-foreground font-medium">Tijd:</span>
				<span class="text-foreground">{selectedBooking.timeslot}</span>
				<span class="text-muted-foreground font-medium">SUBTOTAAL:</span>
				<span class="text-foreground font-medium">€ {selectedBooking.price.toFixed(2)}</span>
				<span class="font-medium text-[var(--color-error)]">KORTING:</span>
				<span class="font-medium text-[var(--color-error)]"
					>- € {(
						selectedBooking.price -
						discountedPrice(selectedBooking.price, discountValue, discountType)
					).toFixed(2)}</span
				>
			</div>
			<div class="border-border mt-4 flex items-center justify-between border-t pt-3">
				<span class="text-foreground font-semibold">TOTAAL:</span>
				<span class="text-foreground text-xl font-bold"
					>€ {discountedPrice(selectedBooking.price, discountValue, discountType).toFixed(2)}</span
				>
			</div>
		</div>
	{/if}

	<!-- Order Summary for Services -->
	{#if tabValue === 'service'}
		<div class="border-border bg-muted/40 rounded-lg border p-4">
			<div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
				<span class="text-muted-foreground font-medium">Diensten:</span>
				<span class="text-foreground"
					>{selectedServices.length} item{selectedServices.length !== 1 ? 's' : ''}</span
				>
				{#if selectedServices.some((s) => (serviceQuantities[s.id] || 1) > 1)}
					<span class="text-muted-foreground font-medium">Basis prijs:</span>
					<span class="text-foreground">€ {baseServicePrice.toFixed(2)}</span>
				{/if}
				<span class="text-muted-foreground font-medium">SUBTOTAAL:</span>
				<span class="text-foreground font-medium">€ {totalServicePrice.toFixed(2)}</span>
				<span class="font-medium text-[var(--color-error)]">KORTING:</span>
				<span class="font-medium text-[var(--color-error)]"
					>- € {(
						totalServicePrice - discountedPrice(totalServicePrice, discountValue, discountType)
					).toFixed(2)}</span
				>
			</div>
			<div class="border-border mt-4 flex items-center justify-between border-t pt-3">
				<span class="text-foreground font-semibold">TOTAAL:</span>
				<span class="text-foreground text-xl font-bold"
					>€ {discountedPrice(totalServicePrice, discountValue, discountType).toFixed(2)}</span
				>
			</div>
		</div>
	{/if}
</div>

<!-- Customer Wizard Modal -->
<CustomerWizard
	open={isWizardOpen}
	onClose={closeWizard}
	onCustomerSelect={handleCustomerSelect}
	onBookingSelect={handleBookingSelect}
/>
