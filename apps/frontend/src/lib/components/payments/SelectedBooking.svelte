<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import type { Booking } from './types';

	interface Props {
		selectedBooking: Booking | null;
	}

	let { selectedBooking }: Props = $props();
</script>

{#if selectedBooking}
	<div class="bg-background absolute w-full rounded-lg border border-none p-4">
		<div class="flex justify-between">
			<h3 class="text-muted-foreground mb-3 text-sm font-semibold">Geselecteerde boeking</h3>
		</div>
		<div class="space-y-3">
			<div
				in:fly={{ y: -20, duration: 200 }}
				class="flex items-center justify-between rounded-lg border p-3 transition-shadow duration-200 hover:shadow-sm"
			>
				<div class="flex items-center gap-3">
					<div class="bg-primary h-3 w-3 rounded-full border-2 border-blue-200"></div>
					<div>
						<span class="text-sm font-medium">{selectedBooking.customer}</span>
						<div class="text-muted-foreground text-xs">{selectedBooking.serviceType}</div>
						<div class="text-muted-foreground text-xs">{selectedBooking.timeslot}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold">
						€ {selectedBooking.price.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	</div>
{/if}
