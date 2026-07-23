<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';
	import * as Select from '$lib/components/ui/select/index';
	import { Plus } from 'lucide-svelte';
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
		{ value: 'NL', label: 'The Netherlands', flag: '🇳🇱' },
		{ value: 'BE', label: 'Belgium', flag: '🇧🇪' },
		{ value: 'DE', label: 'Germany', flag: '🇩🇪' }
	];

	// Valideer of 'Next' in de layout actief mag worden
	$effect(() => {
		if (companyName.trim().length > 0) {
			wizard.enableNext();
		} else {
			wizard.disableNext();
		}
	});
</script>

<div>
	<div class="space-y-4">
		<!-- COMPANY NAME -->
		<div class="space-y-2">
			<Label for="company-name" class="font-medium text-neutral-700">Company name</Label>
			<Input
				id="company-name"
				type="text"
				bind:value={companyName}
				placeholder="Hex Media"
				class="h-10 rounded-lg border-neutral-300"
			/>
		</div>

		<!-- COUNTRY SELECT -->
		<div class="space-y-2">
			<Label class="font-medium text-neutral-700">Country</Label>
			<Select.Root type="single" bind:value={selectedCountry}>
				<Select.Trigger class="h-10 w-full rounded-lg border-neutral-300">
					{#if selectedCountry}
						{@const country = countries.find((c) => c.value === selectedCountry)}
						<span class="flex items-center gap-2">
							<span>{country?.flag}</span>
							<span>{country?.label}</span>
						</span>
					{:else}
						Select country
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

		<!-- ZIPCODE & HOUSE NUMBER -->
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="zipcode" class="font-medium text-neutral-700">Zipcode</Label>
				<Input
					id="zipcode"
					type="text"
					bind:value={zipcode}
					class="h-10 rounded-lg border-neutral-300"
				/>
			</div>
			<div class="space-y-2">
				<Label for="house-number" class="font-medium text-neutral-700">House number</Label>
				<Input
					id="house-number"
					type="text"
					bind:value={houseNumber}
					class="h-10 rounded-lg border-neutral-300"
				/>
			</div>
		</div>

		<!-- ADDRESS WITH PLUS ICON -->
		<div class="space-y-2">
			<Label for="address" class="font-medium text-neutral-700">Address</Label>
			<div class="relative">
				<Input
					id="address"
					type="text"
					bind:value={address}
					class="h-10 rounded-lg border-neutral-300 pr-10"
				/>
				<div
					class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400"
				>
					<Plus class="h-4 w-4" />
				</div>
			</div>
		</div>

		<!-- CITY -->
		<div class="space-y-2">
			<Label for="city" class="font-medium text-neutral-700">City</Label>
			<Input id="city" type="text" bind:value={city} class="h-10 rounded-lg border-neutral-300" />
		</div>

		<!-- CURRENCY SELECT -->
		<div class="space-y-2">
			<Label class="font-medium text-neutral-700">Currency</Label>
			<Select.Root type="single" bind:value={selectedCurrency}>
				<Select.Trigger class="h-10 w-48 rounded-lg border-neutral-300">
					{selectedCurrency === 'EUR' ? 'EUR - Euro' : selectedCurrency}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="EUR">EUR - Euro</Select.Item>
					<Select.Item value="USD">USD - US Dollar</Select.Item>
					<Select.Item value="GBP">GBP - British Pound</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
