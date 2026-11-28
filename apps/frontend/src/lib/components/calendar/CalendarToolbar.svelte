<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DateTime } from 'luxon';
	import { type DateValue } from '@internationalized/date';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import CalendarIcon from '@solar-icons/svelte/linear/calendar';
	import ChevronLeft from '@solar-icons/svelte/linear/alt-arrow-left';
	import ChevronRight from '@solar-icons/svelte/linear/alt-arrow-right';
	import Plus from '@solar-icons/svelte/linear/add';
	import { language, t } from '$lib/translation';
	import { cn } from '$lib/utils';
	import { weekBounds } from './time';
	import type { CalendarView } from './types';

	let {
		selectedDate,
		timezone,
		isToday,
		view,
		onPrev,
		onNext,
		onToday,
		onPick,
		onCreate,
		onViewChange,
		trailing
	}: {
		selectedDate: DateValue;
		timezone: string;
		isToday: boolean;
		view: CalendarView;
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
		onPick: (date: DateValue) => void;
		onCreate?: () => void;
		onViewChange: (view: CalendarView) => void;
		trailing?: Snippet;
	} = $props();

	let calendarOpen = $state(false);
	let calendarDate = $state<DateValue | undefined>(undefined);

	const selectedDT = $derived(
		DateTime.fromJSDate(selectedDate.toDate(timezone)).setZone(timezone).setLocale(language)
	);

	const formattedDate = $derived(
		view === 'day'
			? selectedDT.toFormat('cccc, d MMMM, yyyy')
			: (() => {
					const week = weekBounds(selectedDT);
					const end = week.startDt.plus({ days: 6 });
					return `${week.startDt.toFormat('d MMM')} – ${end.toFormat('d MMM yyyy')}`;
				})()
	);

	$effect(() => {
		if (calendarDate) {
			onPick(calendarDate);
			calendarOpen = false;
			calendarDate = undefined;
		}
	});
</script>

<div
	class="border-border/70 flex h-[52px] shrink-0 items-center justify-between gap-2 border-b px-2 sm:px-3"
>
	<div class="flex min-w-0 items-center gap-1.5">
		<Popover.Root bind:open={calendarOpen}>
			<Popover.Trigger
				class={cn(
					'hover:bg-accent flex h-9 w-60 min-w-0 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors'
				)}
			>
				<CalendarIcon size={16} class="text-muted-foreground shrink-0" />
				<span class="truncate">{formattedDate}</span>
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0" align="start">
				<Calendar locale={language} type="single" bind:value={calendarDate} />
			</Popover.Content>
		</Popover.Root>

		<div class="border-border/70 flex shrink-0 items-center rounded-md border">
			<button
				type="button"
				class="hover:bg-accent flex h-8 w-8 items-center justify-center rounded-l-md transition-colors"
				aria-label="Vorige"
				onclick={onPrev}
			>
				<ChevronLeft size={16} />
			</button>
			<button
				type="button"
				class="hover:bg-accent border-border/70 h-8 border-x px-2.5 text-xs font-medium transition-colors disabled:opacity-50"
				disabled={isToday}
				onclick={onToday}
			>
				{t.dateRange.today}
			</button>
			<button
				type="button"
				class="hover:bg-accent flex h-8 w-8 items-center justify-center rounded-r-md transition-colors"
				aria-label="Volgende"
				onclick={onNext}
			>
				<ChevronRight size={16} />
			</button>
		</div>

		<div class="border-border/70 flex h-8 items-stretch overflow-hidden rounded-md border">
			<button
				type="button"
				class={cn(
					'flex h-full items-center px-2.5 text-xs font-medium transition-colors',
					view === 'day' ? 'bg-accent' : 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => onViewChange('day')}
			>
				Dag
			</button>
			<button
				type="button"
				class={cn(
					'border-border/70 flex h-full items-center border-l px-2.5 text-xs font-medium transition-colors',
					view === 'week' ? 'bg-accent' : 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => onViewChange('week')}
			>
				Week
			</button>
		</div>
	</div>

	{#if trailing}
		{@render trailing()}
	{:else}
		<Button size="sm" class="h-8 shrink-0 gap-1.5" onclick={() => onCreate?.()}>
			<Plus size={16} />
			<span class="hidden sm:inline">Nieuwe afspraak</span>
			<span class="sm:hidden">Nieuw</span>
		</Button>
	{/if}
</div>
