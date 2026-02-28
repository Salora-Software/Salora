<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import type { Service, ServiceCategory } from './types';

	interface Props {
		selectedServices: Service[];
		serviceCategories: Record<string, ServiceCategory>;
		serviceQuantities: Record<string, number>;
		onAddQuantity: (serviceId: string) => void;
		onRemoveQuantity: (serviceId: string) => void;
	}

	let {
		selectedServices,
		serviceCategories,
		serviceQuantities,
		onAddQuantity,
		onRemoveQuantity
	}: Props = $props();
</script>

{#if selectedServices.length > 0}
	<div class="bg-background absolute w-full rounded-lg border border-none p-4 pt-0">
		<div class="flex justify-between">
			<h3 class="text-muted-foreground mb-3 text-sm font-semibold">
				Geselecteerde diensten ({selectedServices.length})
			</h3>
		</div>
		<div class="space-y-3">
			{#each selectedServices as service}
				{@const category = serviceCategories[service.category]}
				<div
					in:fly={{ y: -20, duration: 200 }}
					class="flex items-center justify-between gap-2 rounded-lg border p-3 transition-shadow duration-200 hover:shadow-sm"
				>
					<div class="flex items-center gap-2">
						<div
							class={cn('h-3 w-3 rounded-full border-2', category.bgColor, category.borderColor)}
						></div>
						<div>
							<span class="text-sm font-medium">{service.name}</span>
							{#if service.duration}
								<div class="text-muted-foreground text-xs">{service.duration}min</div>
							{/if}
						</div>
						{#if serviceQuantities[service.id] > 1}
							<div
								class="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold"
							>
								{serviceQuantities[service.id]}x
							</div>
						{/if}
					</div>
					<div
						class="max-w-content grid grid-cols-1 items-center justify-end gap-2 text-right lg:grid-cols-[auto_1fr]"
					>
						<span class="text-sm font-semibold">
							€ {((serviceQuantities[service.id] || 1) * service.price).toFixed(2)}
							{#if serviceQuantities[service.id] > 1}
								<span class="text-xs text-gray-500"
									>({serviceQuantities[service.id]}x €{service.price})</span
								>
							{/if}
						</span>
						<div class="flex items-center justify-end gap-1">
							<!-- Minus Button -->
							<button
								onclick={() => onRemoveQuantity(service.id)}
								aria-label="Verwijder {service.name}"
								class="group flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-100 text-red-700 transition-all
								duration-200
								hover:border-red-300 hover:bg-red-200 active:scale-[0.95]"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 12h12"
									/>
								</svg>
							</button>
							<!-- Plus Button -->
							<button
								onclick={() => onAddQuantity(service.id)}
								aria-label="Voeg nog een {service.name} toe"
								class="group flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-100 text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-200
								active:scale-[0.95]"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
