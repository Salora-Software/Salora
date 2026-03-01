<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Separator } from '$lib/components/ui/separator/';
	import type { BookingButton } from '$lib/booking-utils.js';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		bookingSteps: BookingButton[];
		branch: any;
		onButtonClick: (index: number) => void;
	}

	let { bookingSteps, branch, onButtonClick }: Props = $props();
</script>

<div
	class="widget-sidebar left col-start-1 row-start-1 grid w-[35%] grid-rows-[1fr_auto] gap-2 overflow-hidden border-r p-4"
	out:fly={{ x: 100, duration: 500, opacity: 1 }}
>
	<div class="buttonsContainer flex w-full flex-col gap-4">
		{#each bookingSteps as button, i}
			{#await new Promise((resolve) => setTimeout(resolve, 0)) then}
				<button
					class="widget-sidebar-button rounded-md border transition-colors hover:bg-opacity-50"
					class:cursor-not-allowed={!button.selected && !button.active}
					onclick={() => {
						if (button.selected || !button.active) return;
						onButtonClick(i);
					}}
					in:fly={{ x: -100, duration: 250, delay: 100 * i }}
				>
					<div class="flex w-full justify-between p-3">
						<div>
							<div class="flex items-center gap-2">
								<button.icon class="widget-sidebar-accent" size="20" />
								<div>
									<h3 class="widget-sidebar-text text-left font-medium">
										{button.name}
									</h3>
								</div>
							</div>
							{#if typeof button.description === 'function' ? button.description() : button.description}
								<div in:fly={{ x: 50, duration: 250 }} class="mt-1">
									<p class="widget-sidebar-text-muted text-left text-sm">
										{typeof button.description === 'function'
											? button.description()
											: button.description}
									</p>
								</div>
							{/if}
						</div>
						{#if button.active}
							<div
								class="bg-widget-accent flex h-[24px] min-w-[24px] items-center justify-center rounded-full border transition-all duration-150"
								in:scale={{ duration: 300, start: 0.5, easing: cubicOut }}
							>
								<Check class="text-white" size="15" />
							</div>
						{:else}
							<div
								class={`widget-input h-[24px] min-w-[24px] rounded-full border transition-all duration-150 ${button.selected ? 'border-2' : ''}`}
								style={`${button.selected ? 'background: rgba(var(--widget-accent-rgb), 0.1); border-color: var(--widget-accent);' : ''}`}
								in:scale={{ duration: 300, start: 0.5, easing: cubicOut }}
							></div>
						{/if}
					</div>
				</button>
			{/await}
		{/each}
	</div>
	<Separator class="bg-widget-sidebar-border my-2" />
	<div class="flex flex-col gap-1">
		<h2 class="widget-sidebar-text text-md font-semibold">{m["sidebar.getInContact"]()}</h2>
		<a
			href={`tel:${branch.phone}`}
			class="widget-sidebar-accent hover:widget-accent-text text-sm transition-colors"
		>
			{branch.phone}
		</a>
		<a
			href={`mailto:${branch.email}`}
			class="widget-sidebar-accent hover:widget-accent-text text-sm transition-colors"
		>
			{branch.email}
		</a>
	</div>
</div>

<style>
	.left {
		border-radius: var(--widget-border-radius) 0 0 var(--widget-border-radius);
	}
</style>
