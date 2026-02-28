<script lang="ts">
	import { Button } from '$lib/components/ui/button/index';
	import { cn } from '$lib/utils';
	import type { Booking, Service } from './types';

	interface Props {
		tabValue: 'booking' | 'service';
		selectedBooking?: Booking;
		selectedServices: Service[];
		onUnselectAll: () => void;
		onConfirmPayment: () => void;
	}

	let { tabValue, selectedBooking, selectedServices, onUnselectAll, onConfirmPayment }: Props =
		$props();

	let cancelable = $derived(selectedServices.length > 0 && tabValue === 'service');
	let canConfirm = $derived(
		(selectedServices.length > 0 && tabValue === 'service') ||
			(selectedBooking && tabValue === 'booking')
	);
</script>

<div class="border-border flex flex-wrap p-3 pb-4">
	{#if tabValue === 'service'}
		<Button
			variant="destructive"
			class="xs:h-12 xs:text-base h-10 min-w-0 flex-1 rounded-lg border-0 text-sm font-semibold text-white shadow-sm  sm:h-14 sm:rounded-r-none md:h-16 md:text-lg"
			onclick={onUnselectAll}
			disabled={!cancelable}
		>
			<span class="truncate">ANNULEER</span>
		</Button>
	{/if}
	<Button
		variant="default"
		class={cn(
			'xs:h-12 xs:text-base h-10 min-w-0 flex-1 rounded-lg border-0 text-sm font-semibold text-white shadow-sm sm:h-14 md:h-16 md:text-lg',
			tabValue === 'service' ? 'sm:flex-[2] sm:rounded-l-none' : 'w-full'
		)}
		disabled={!canConfirm}
		onclick={onConfirmPayment}
	>
		<span class="truncate">BEVESTIG BETALING</span>
	</Button>
</div>
