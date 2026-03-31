<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import TelInput from '$lib/components/ui/tel-input/tel-input.svelte';
	import type { BookingValues } from '$lib/booking-utils.js';

	interface Props {
		bookingState: BookingValues;
	}

	let { bookingState = $bindable() }: Props = $props();
</script>

<Label class="widget-content-text mb-2">Naam *</Label>
<div class="flex w-full justify-between gap-2">
	<Input
		class="widget-input widget-content-text mb-2"
		bind:value={bookingState.contact.firstName}
		placeholder="Voornaam"
	/>
	<Input
		class="widget-input widget-content-text mb-2"
		bind:value={bookingState.contact.lastName}
		placeholder="Achternaam"
	/>
</div>
<Label class="widget-content-text mb-2">Email *</Label>
<Input
	class="widget-input widget-content-text mb-2"
	type="email"
	bind:value={bookingState.contact.email}
	placeholder="user@example.com"
/>
<Label class="widget-content-text mb-2">Telefoonnummer</Label>
<TelInput
	class="widget-input widget-content-text mb-2"
	placeholder="+31 612345678"
	bind:value={bookingState.contact.phone}
/>
<Label class="widget-content-text mb-2">Opmerking</Label>
<Textarea
	bind:value={bookingState.contact.notes}
	class="widget-input widget-content-text mb-2 max-h-[250px]"
/>
