<script lang="ts">
	import {
		CheckIcon,
		Scissors,
		Zap,
		Palette,
		Sparkles,
		Package,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { scale } from 'svelte/transition';
	import TinySlider from 'svelte-tiny-slider';
	import type { Service, ServiceCategory } from './types';

	interface Props {
		services: Service[];
		serviceCategories: Record<string, ServiceCategory>;
		selectedServiceIds: string[];
		selectedCategory: string | null;
		onServiceToggle: (serviceId: string) => void;
		onCategoryChange: (category: string | null) => void;
	}

	let {
		services,
		serviceCategories,
		selectedServiceIds,
		selectedCategory,
		onServiceToggle,
		onCategoryChange
	}: Props = $props();

	let filteredServices = $derived(
		selectedCategory ? services.filter((s) => s.category === selectedCategory) : services
	);

	// Function to get the appropriate icon for each category
	function getCategoryIcon(categoryKey: string) {
		switch (categoryKey) {
			case 'hair':
				return Scissors;
			case 'beard':
				return Zap;
			case 'styling':
				return Palette;
			case 'treatment':
				return Sparkles;
			default:
				return Scissors;
		}
	}

	// Function to get item count for each category
	function getCategoryCount(categoryKey: string) {
		return services.filter((s) => s.category === categoryKey).length;
	}

	// Total count for "All Categories"
	let totalCount = $derived(services.length);

	// Create array of all categories including "All"
	let allCategories = $derived([
		{ key: null, name: 'Alles', count: totalCount, icon: Package },
		...Object.entries(serviceCategories).map(([key, category]) => ({
			key,
			name: category.name,
			count: getCategoryCount(key),
			icon: getCategoryIcon(key)
		}))
	]);

	let slider: TinySlider | undefined;
</script>

<div class="relative h-full w-full">
	<div class="absolute h-full w-full">
		<div class=" grid h-full grid-rows-[auto_1fr]">
			<!-- Category Filter Buttons -->
			<div class="relative overflow-hidden p-3">
				<div class=" max-w-max">
					<TinySlider bind:this={slider} fill={true}>
						{#snippet children({ shown })}
							{#each allCategories as categoryItem, i}
								{@const IconComponent = categoryItem.icon}
								<button
									class={cn(
										'mr-4 grid aspect-square h-24 grid-rows-[1fr_auto] rounded-lg border-1 p-2 text-left transition-all duration-200',
										selectedCategory === categoryItem.key
											? categoryItem.key === null
												? 'border-primary bg-primary text-white shadow-md'
												: categoryItem.key === 'hair'
													? 'border-[var(--color-category-hair-active)] bg-[var(--color-category-hair-active)] text-white shadow-md'
													: categoryItem.key === 'beard'
														? 'border-[var(--color-category-beard-active)] bg-[var(--color-category-beard-active)] text-white shadow-md'
														: categoryItem.key === 'styling'
															? 'border-[var(--color-category-styling-active)] bg-[var(--color-category-styling-active)] text-white shadow-md'
															: categoryItem.key === 'treatment'
																? 'border-[var(--color-category-treatment-active)] bg-[var(--color-category-treatment-active)] text-white shadow-md'
																: 'border-muted bg-muted text-muted-foreground shadow-md'
											: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
									)}
									onclick={() => {
										slider?.setIndex(i - 1 || 0);
										onCategoryChange(categoryItem.key);
									}}
								>
									<div
										class={cn(
											'mb-2 flex h-8 w-8 items-center justify-center rounded-full',
											selectedCategory === categoryItem.key ? 'bg-white/20' : 'bg-gray-100'
										)}
									>
										<IconComponent
											class={cn(
												'h-5 w-5',
												selectedCategory === categoryItem.key ? 'text-white' : 'text-gray-600'
											)}
										/>
									</div>
									<div>
										<div class="text-sm font-medium">{categoryItem.name}</div>
										<div
											class={cn(
												'text-xs',
												selectedCategory === categoryItem.key ? 'text-white/70' : 'text-gray-500'
											)}
										>
											{categoryItem.count} Items
										</div>
									</div>
								</button>
							{/each}
						{/snippet}
					</TinySlider>
				</div>
			</div>

			<!-- Services Grid -->
			<div class="grid max-h-full w-full overflow-auto p-3">
				<div class="grid h-max grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
					{#each filteredServices as service}
						{@const category = serviceCategories[service.category]}
						{@const isSelected = selectedServiceIds.includes(service.id)}
						<button
							class={cn(
								'relative max-h-max rounded-lg border-2 p-4 text-left',
								isSelected
									? 'bg-primary/10 border-primary ring-primary/20 shadow-lg ring-4'
									: cn(category.bgColor, category.borderColor, ' hover:shadow-sm')
							)}
							onclick={() => onServiceToggle(service.id)}
						>
							{#if isSelected}
								<div
									in:scale={{ duration: 150, start: 0.1 }}
									class="bg-primary absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
								>
									<CheckIcon class="p-1" />
								</div>
							{/if}
							<div class="flex flex-col">
								<div
									class={cn(
										'mb-1 text-sm font-semibold',
										isSelected ? 'text-primary' : category.color
									)}
								>
									{service.name}
								</div>
								<div class="flex items-center justify-between">
									<span class={cn('text-lg font-bold', isSelected ? 'text-primary' : '')}>
										€ {service.price.toFixed(2)}
									</span>
									{#if service.duration}
										<span
											class={cn(
												'text-xs',
												isSelected ? 'text-primary/70' : 'text-muted-foreground'
											)}
										>
											{service.duration}min
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
