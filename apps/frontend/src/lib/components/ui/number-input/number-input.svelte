<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import Minus from 'lucide-svelte/icons/minus';
	import Plus from 'lucide-svelte/icons/plus';

	const minValue = 0;
	function increment() {
		value = value + 1;
	}

	function decrement() {
		if (value > minValue) {
			value = value - 1;
		}
	}

	function handleInput(event: Event) {
		value = parseInt(value) || 0;
	}
	let {
		ref = $bindable(null),
		value = $bindable<number | null>(0),
		class: className,
		error = false,
		disabled = false,
		...restProps
	}: WithElementRef<HTMLInputAttributes> & {
		error?: boolean;
		disabled?: boolean;
	} = $props();
</script>

<div
	class={cn(
		'border-input ring-offset-background focus-within:border-ring focus-within:ring-ring/30 relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border text-sm whitespace-nowrap shadow-sm shadow-black/[.04] transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none',
		className
	)}
>
	<button
		id="decrement-button"
		onclick={decrement}
		class="border-input bg-background text-muted-foreground/80 ring-offset-background hover:bg-accent hover:text-foreground -ms-px flex aspect-square h-[inherit] items-center justify-center rounded-s-lg border text-sm transition-shadow disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
		aria-label="Decrease value"
		aria-labelledby="decrement-button input-28"
		aria-controls="input-28"
		disabled={disabled || value <= minValue}
	>
		<Minus size={16} stroke-width={2} aria-hidden="true" />
	</button>
	<input
		id="input-28"
		type="text"
		bind:value
		oninput={handleInput}
		aria-labelledby="input-28"
		autocomplete="off"
		inputmode="numeric"
		autocorrect="off"
		aria-roledescription="Number input"
		spellcheck="false"
		min={minValue}
		{disabled}
		class="bg-background text-foreground w-full grow px-3 py-2 text-center tabular-nums focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		{...restProps}
	/>
	<button
		id="increment-button"
		onclick={increment}
		class="border-input bg-background text-muted-foreground/80 ring-offset-background hover:bg-accent hover:text-foreground -me-px flex aspect-square h-[inherit] items-center justify-center rounded-e-lg border text-sm transition-shadow disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
		aria-label="Increase value"
		aria-labelledby="increment-button input-28"
		aria-controls="input-28"
		{disabled}
	>
		<Plus size={16} stroke-width={2} aria-hidden="true" />
	</button>
</div>
