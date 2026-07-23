<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';
	import * as Select from '$lib/components/ui/select/index';
	import { Building2 } from 'lucide-svelte';
	import { getWizardState } from '../wizardState.svelte';

	const wizard = getWizardState();

	// Formulier State
	let companyName = $state('Hex Media');
	let selectedCountry = $state('NL');
	let zipcode = $state('');
	let houseNumber = $state('');
	let address = $state('');
	let city = $state('');
	let selectedCurrency = $state('EUR');

	// Landen opties
	const countries = [
		{ value: 'NL', label: 'Nederland', flag: '🇳🇱' },
		{ value: 'BE', label: 'België', flag: '🇧🇪' },
		{ value: 'DE', label: 'Duitsland', flag: '🇩🇪' }
	];

	// Valideer of 'Volgende' in de layout actief mag worden
	$effect(() => {
		if (companyName.trim().length > 0) {
			wizard.enableNext();
		} else {
			wizard.disableNext();
		}
	});
</script>

<div class="space-y-5">
	<!-- BEDRIJFSNAAM -->
	<div class="space-y-2">
		<Label for="company-name" class="font-medium text-neutral-700">Bedrijfsnaam</Label>
		<div class="relative">
			<Input
				id="company-name"
				type="text"
				bind:value={companyName}
				placeholder="bijv. Salon Bellezza"
				class="h-10 pl-10"
			/>
			<div
				class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
			>
				<Building2 class="h-4 w-4" />
			</div>
		</div>
	</div>

	<!-- LAND SELECT -->
	<div class="space-y-2">
		<Label class="font-medium text-neutral-700">Land</Label>
		<Select.Root type="single" bind:value={selectedCountry}>
			<Select.Trigger class="h-10 w-full">
				{#if selectedCountry}
					{@const country = countries.find((c) => c.value === selectedCountry)}
					<span class="flex items-center gap-2">
						<span>{country?.flag}</span>
						<span>{country?.label}</span>
					</span>
				{:else}
					Selecteer een land
				{/if}
			</Select.Trigger>
			<Select.Content>
				{#each countries as country}
					<Select.Item value={country.value} class="flex items-center gap-2">
						<span>{country.flag}</span>
						<span>{country.label}</span>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- POSTCODE & HUISNUMMER -->
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label for="zipcode" class="font-medium text-neutral-700">Postcode</Label>
			<Input
				id="zipcode"
				type="text"
				bind:value={zipcode}
				placeholder="1234 AB"
				class="h-10 uppercase placeholder:normal-case"
			/>
		</div>
		<div class="space-y-2">
			<Label for="house-number" class="font-medium text-neutral-700">Huisnummer</Label>
			<Input
				id="house-number"
				type="text"
				bind:value={houseNumber}
				placeholder="12 a"
				class="h-10"
			/>
		</div>
	</div>

	<!-- STRAATNAAM / ADRES -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<Label for="address" class="font-medium text-neutral-700">Adres</Label>
			<span class="text-xs text-neutral-400">Straat en huisnummer</span>
		</div>
		<Input id="address" type="text" bind:value={address} placeholder="Hoofdstraat 1" class="h-10" />
	</div>

	<!-- PLAATS EN VALUTA IN ÉÉN RIJ -->
	<div class="grid grid-cols-3 gap-4">
		<div class="col-span-2 space-y-2">
			<Label for="city" class="font-medium text-neutral-700">Plaats</Label>
			<Input id="city" type="text" bind:value={city} placeholder="Groningen" class="h-10" />
		</div>

		<div class="space-y-2">
			<Label class="font-medium text-neutral-700">Valuta</Label>
			<Select.Root type="single" bind:value={selectedCurrency}>
				<Select.Trigger class="h-10 w-full">
					{selectedCurrency === 'EUR' ? 'EUR (€)' : selectedCurrency}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="EUR">EUR (€)</Select.Item>
					<Select.Item value="USD">USD ($)</Select.Item>
					<Select.Item value="GBP">GBP (£)</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
