<script lang="ts">
	import type { DateValue } from '@internationalized/date';
	import { formatBookedDuration, occupancyRatio } from './time';
	import type { WeekStripDay } from './types';
	import { cn } from '$lib/utils';

	let {
		days,
		onSelect
	}: {
		days: WeekStripDay[];
		onSelect: (date: DateValue) => void;
	} = $props();
</script>

<div class="border-border/70 grid shrink-0 grid-cols-7 gap-1 border-b px-2 py-1.5">
	{#each days as day (day.dayNumber + '-' + day.weekdayShort)}
		{@const ratio = occupancyRatio(day.bookedMinutes, day.availableMinutes)}
		<button
			type="button"
			class={cn(
				'group flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1 transition-colors',
				day.isSelected ? 'bg-primary/10 ring-primary/30 ring-1' : 'hover:bg-accent/70'
			)}
			title={`${formatBookedDuration(day.bookedMinutes)} geboekt`}
			onclick={() => onSelect(day.date)}
		>
			<span
				class={cn(
					'text-[10px] leading-none font-medium tracking-wide uppercase',
					day.isSelected ? 'text-primary' : 'text-muted-foreground'
				)}
			>
				{day.weekdayShort}
			</span>
			<span class="flex items-center gap-1 leading-none">
				<span
					class={cn(
						'text-sm font-semibold tabular-nums',
						day.isSelected ? 'text-primary' : day.isToday ? 'text-primary' : 'text-foreground'
					)}
				>
					{day.dayNumber}
				</span>
				{#if day.isToday}
					<span class="bg-primary h-1 w-1 rounded-full"></span>
				{/if}
			</span>
			<span class="bg-muted h-1 w-full max-w-10 overflow-hidden rounded-full">
				<span
					class={cn(
						'block h-full rounded-full transition-[width] duration-300',
						day.isSelected ? 'bg-primary' : 'bg-primary/60'
					)}
					style={`width: ${ratio * 100}%`}
				></span>
			</span>
		</button>
	{/each}
</div>
