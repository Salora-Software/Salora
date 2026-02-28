<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { CountryCode, DetailedValue, E164Number } from 'svelte-tel-input/types';
	import type { ChangeEventHandler } from 'svelte/elements';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Phone from 'lucide-svelte/icons/phone';
	import { normalizedCountries, TelInput } from 'svelte-tel-input';
	import 'svelte-tel-input/styles/flags.css';
	const handleCountryChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
		const { value } = e.currentTarget;
		selectedCountry = (value as CountryCode) || null;
	};

	let {
		ref = $bindable(null),
		value = $bindable<E164Number | null>(null),
		detailedValue = $bindable<DetailedValue | null>(null),
		selectedCountry = $bindable<CountryCode | null>('NL'),
		class: className,
		error = false,
		disabled = false,
		...restProps
	}: WithElementRef<HTMLInputAttributes> & {
		error?: boolean;
		selectedCountry?: CountryCode | null;
		detailedValue?: DetailedValue | null;
		formattedValue?: string | null;
		disabled?: boolean;
	} = $props();
</script>

<div class="flex rounded-md shadow-sm shadow-black/[.04]">
	<div
		class={cn(
			'border-input bg-background text-muted-foreground ring-offset-background focus-within:border-ring focus-within:text-foreground focus-within:ring-ring/30 hover:bg-accent hover:text-foreground relative inline-flex items-center self-stretch rounded-l-lg border py-2 ps-3 pe-2 transition-shadow focus-within:z-10 focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50',
			className
		)}
	>
		<div class="inline-flex items-center gap-1" aria-hidden="true">
			<span class="flex h-4 w-5 items-center overflow-hidden rounded-sm">
				{#if selectedCountry}
					<span class="flag flag-{selectedCountry.toLowerCase()} !h-3.25 !w-5" aria-hidden="true"
					></span>
				{:else}
					<Phone size={16} aria-hidden="true" />
				{/if}
			</span>
			<span class="text-muted-foreground/80">
				<ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
			</span>
		</div>
		<select
			onchange={handleCountryChange}
			class="absolute inset-0 text-sm opacity-0"
			aria-label="Select country"
		>
			<option value="">Select a country</option>
			{#each normalizedCountries as country (country.id)}
				<option value={country.id}>
					{country.label}
				</option>
			{/each}
		</select>
	</div>
	<TelInput
		{...restProps}
		id="input-46"
		required
		placeholder="Enter phone number"
		bind:country={selectedCountry}
		options={{
			format: 'international'
		}}
		class={cn(
			'border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-10 w-full rounded-r-lg border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-black focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)}
		bind:value
		bind:detailedValue
	/>
</div>
