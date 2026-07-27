<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';
	import * as Select from '$lib/components/ui/select/index';
	import { Building2 } from '@lucide/svelte';
	import { getWizardState } from '../wizardState.svelte';
	import { orpc, orpcT } from '$lib/orpc';
	import { createQuery } from '@tanstack/svelte-query';
	import { z } from 'zod';

	const wizard = getWizardState();
	const { data } = $props();
	let branchesQuery = createQuery(() => orpcT.v1.organisation.getOrganisations.queryOptions());
	let onboardingBranch = $derived(branchesQuery.data?.find((branch) => branch.onboardingStep));

	// Formulier State
	let companyName = $state('Hex Media');
	let selectedCountry = $state('NL');
	let zipcode = $state('9765 EC');
	let houseNumber = $state('8');
	let address = $state('Paterswolde');
	let city = $state('Onlandseweg');
	let selectedCurrency = $state('EUR');

	// Landen opties
	const countries = [
		{ value: 'NL', label: 'Nederland', flag: '🇳🇱' },
		{ value: 'BE', label: 'België', flag: '🇧🇪' },
		{ value: 'DE', label: 'Duitsland', flag: '🇩🇪' }
	];

	// Zod Schema voor formuliervalidatie
	const companyFormSchema = z.object({
		companyName: z.string().trim().min(1, 'Bedrijfsnaam is verplicht'),
		selectedCountry: z.string().min(1, 'Land is verplicht'),
		zipcode: z.string().trim().min(1, 'Postcode is verplicht'),
		houseNumber: z.string().trim().min(1, 'Huisnummer is verplicht'),
		address: z.string().trim().min(1, 'Adres is verplicht'),
		city: z.string().trim().min(1, 'Plaats is verplicht'),
		selectedCurrency: z.string().min(1, 'Valuta is verplicht')
	});

	wizard.setOnNext(async () => {
		if (!onboardingBranch) {
			await orpc.v1.organisation.createOrganisation({
				name: companyName,
				country: selectedCountry,
				postalCode: zipcode,
				city: city,
				street: address,
				streetNumber: houseNumber
			});
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	// Valideer met Zod of 'Volgende' in de layout actief mag worden
	$effect(() => {
		const result = companyFormSchema.safeParse({
			companyName,
			selectedCountry,
			zipcode,
			houseNumber,
			address,
			city,
			selectedCurrency
		});

		if (result.success) {
			wizard.enableNext();
		} else {
			wizard.disableNext();
		}
	});
</script>

<div class="space-y-5">
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

	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<Label for="address" class="font-medium text-neutral-700">Adres</Label>
			<span class="text-xs text-neutral-400">Straat en huisnummer</span>
		</div>
		<Input id="address" type="text" bind:value={address} placeholder="Hoofdstraat 1" class="h-10" />
	</div>

	<div class="space-y-2">
		<Label for="city" class="font-medium text-neutral-700">Plaats</Label>
		<Input id="city" type="text" bind:value={city} placeholder="Groningen" class="h-10" />
	</div>
</div>
