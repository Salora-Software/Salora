<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select';
	import type { BookingValues } from '$lib/booking-utils.js';
	import type { RouterOutput } from '@salora/trpc-types';

	interface Props {
		bookingState: BookingValues;
		branch: RouterOutput['v1']['getBranch'];
		onServiceChange?: (serviceId: string) => void;
	}

	let { bookingState = $bindable(), branch, onServiceChange }: Props = $props();
</script>

<Label class="widget-content-text mb-2">Soort afspraak *</Label>
<Select.Root
	type="single"
	bind:value={bookingState.appointment.value}
	onValueChange={(v) => {
		if (onServiceChange && v) {
			onServiceChange(v);
		}
	}}
>
	<Select.Trigger class="widget-input w-full border">
		<p class="widget-content-text">
			{branch.services.find((service: any) => service.id === bookingState.appointment.value)
				?.name || ''}
		</p>
	</Select.Trigger>
	<Select.Content class="focus-override z-110 widget-input w-full border">
		{#each branch.services as service}
			<Select.Item value={service.id}>
				<div class="flex w-full justify-between">
					<p class="widget-content-text">
						{service.name}
					</p>
					<p class="widget-accent-text">
						{service.duration} min - € {service.price.toFixed(2)}
					</p>
				</div>
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
