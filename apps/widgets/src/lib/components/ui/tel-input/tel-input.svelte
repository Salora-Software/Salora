<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import Phone from 'lucide-svelte/icons/phone';
	import { AsYouType } from 'libphonenumber-js';

	let {
		ref = $bindable(null),
		value = $bindable('+31'),
		class: className,
		error = false,
		disabled = false,
		...restProps
	}: WithElementRef<HTMLInputAttributes> & {
		error?: boolean;
		disabled?: boolean;
	} = $props();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Simple regex: allow +, digits, and spaces
		let val = input.value.replace(/[^0-9+ ]/g, '');
		const formatter = new AsYouType('NL');
		val = formatter.input(val);
		value = val;
		input.value = val;
	}
</script>

<div class="flex rounded-md shadow-sm shadow-black/4">
	<div
		class={cn(
			'border-input bg-background/50 text-muted-foreground ring-offset-background relative inline-flex items-center self-stretch rounded-l-lg rounded-r-none border border-r-0 py-2 pe-2 ps-3 transition-shadow has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50',
			className
		)}
	>
		<div class="inline-flex items-center gap-1" aria-hidden="true">
			<Phone size={16} aria-hidden="true" />
		</div>
	</div>
	<input
		{...restProps}
		type="tel"
		id="input-46"
		required
		placeholder="Telefoonnummer"
		{value}
		oninput={handleInput}
		{disabled}
		class={cn(
			'border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-10 w-full rounded-l-none rounded-r-lg border px-3 py-2 text-base focus:border-black focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className,
			error ? 'border-destructive' : ''
		)}
	/>
</div>
