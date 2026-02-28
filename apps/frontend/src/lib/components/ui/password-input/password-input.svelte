<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { E164Number } from 'svelte-tel-input/types';

	import Eye from 'lucide-svelte/icons/eye';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import { Input } from '../input/index';

	let {
		ref = $bindable(null),
		value = $bindable<E164Number | null>(null),
		isVisible = $bindable(false),
		class: className,
		error = false,
		disabled = false,
		...restProps
	}: WithElementRef<HTMLInputAttributes> & {
		error?: boolean;
		disabled?: boolean;
		isVisible?: boolean;
	} = $props();

	function toggleVisibility() {
		isVisible = !isVisible;
	}
</script>

<div class={cn('relative w-full', className)}>
	<Input
		id="input-23"
		class={cn('pe-9', className)}
		placeholder="Password"
		type={isVisible ? 'text' : 'password'}
		{disabled}
		bind:value
		bind:ref
		{...restProps}
	/>
	<button
		class="text-muted-foreground/80 ring-offset-background hover:text-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-ring/30 absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg transition-shadow focus-visible:border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
		type="button"
		onclick={toggleVisibility}
		aria-label={isVisible ? 'Hide password' : 'Show password'}
		aria-pressed={isVisible}
		aria-controls="password"
	>
		{#if isVisible}
			<EyeOff size={16} stroke-width={2} aria-hidden="true" />
		{:else}
			<Eye size={16} stroke-width={2} aria-hidden="true" />
		{/if}
	</button>
</div>
