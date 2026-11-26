<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import TelInput from '$lib/components/ui/tel-input/tel-input.svelte';
	import type { BookingValues } from '$lib/booking-utils.js';

	interface Props {
		bookingState: BookingValues;
		requiredFields?: string[];
	}

	let { bookingState = $bindable(), requiredFields = ['firstName', 'lastName', 'email'] }: Props =
		$props();

	const isRequired = (field: string) => requiredFields.includes(field);
</script>

<div class="flex w-full justify-between gap-2">
	<div class="flex w-full flex-col">
		<Label class="widget-content-text mb-2">
			Voornaam{#if isRequired('firstName')}<span class="widget-error"> *</span>{/if}
		</Label>
		<Input
			class="widget-input widget-content-text mb-2"
			bind:value={bookingState.contact.firstName}
			placeholder="Voornaam"
		/>
	</div>
	<div class="flex w-full flex-col">
		<Label class="widget-content-text mb-2">
			Achternaam{#if isRequired('lastName')}<span class="widget-error"> *</span>{/if}
		</Label>
		<Input
			class="widget-input widget-content-text mb-2"
			bind:value={bookingState.contact.lastName}
			placeholder="Achternaam"
		/>
	</div>
</div>
<Label class="widget-content-text mb-2">
	Email{#if isRequired('email')}<span class="widget-error"> *</span>{/if}
</Label>
<Input
	class="widget-input widget-content-text mb-2"
	type="email"
	bind:value={bookingState.contact.email}
	placeholder="user@example.com"
/>
<Label class="widget-content-text mb-2">
	Telefoonnummer{#if isRequired('phone')}<span class="widget-error"> *</span>{/if}
</Label>
<TelInput
	class="widget-input widget-content-text mb-2"
	placeholder="+31 612345678"
	bind:value={bookingState.contact.phone}
/>
<Label class="widget-content-text mb-2">
	Opmerking{#if isRequired('notes')}<span class="widget-error"> *</span>{/if}
</Label>
<Textarea
	bind:value={bookingState.contact.notes}
	class="widget-input widget-content-text mb-2 max-h-[250px]"
/>
