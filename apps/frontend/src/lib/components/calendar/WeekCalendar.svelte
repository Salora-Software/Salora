<script lang="ts">
	import { onMount } from 'svelte';
	import { draggable } from '@neodrag/svelte';
	import { DateTime } from 'luxon';
	import type { DateValue } from '@internationalized/date';
	import { cn } from '$lib/utils';
	import type { MemberType, ServiceType } from '$lib/trpc';
	import BookingCard from './BookingCard.svelte';
	import BookingEditPopover from './BookingEditPopover.svelte';
	import {
		computeLanes,
		formatBookedDuration,
		occupancyRatio,
		pxForMinutes,
		type Positioned
	} from './time';
	import type {
		CalendarEvent,
		DragStateHandler,
		EventChangeHandler,
		EventDeleteHandler,
		EventSaveHandler,
		WeekDayColumn
	} from './types';

	let {
		days,
		events,
		services = [],
		members = [],
		timezone,
		hourHeight = 96,
		class: className,
		onEventChange,
		onEventDelete,
		onEventSave,
		onDragStateChange,
		onSelectDay
	}: {
		days: WeekDayColumn[];
		events: CalendarEvent[];
		services?: ServiceType[];
		members?: MemberType[];
		timezone: string;
		hourHeight?: number;
		class?: string;
		onEventChange: EventChangeHandler;
		onEventDelete: EventDeleteHandler;
		onEventSave: EventSaveHandler;
		onDragStateChange?: DragStateHandler;
		onSelectDay: (date: DateValue) => void;
	} = $props();

	const totalHeight = $derived(24 * hourHeight);
	const snapPx = $derived(hourHeight / 4);
	const hours = $derived(Array.from({ length: 24 }, (_, i) => i));

	let scrollEl = $state<HTMLDivElement | null>(null);
	let nowMinutes = $state(0);
	let lastScrollKey = '';
	let dragPos = $state<Record<string, { x: number; y: number }>>({});

	const memberName = $derived.by(() => {
		const map = new Map<string, string>();
		for (const member of members) map.set(member.id, member.user.name);
		return map;
	});

	const eventsByDay = $derived.by(() => {
		const map = new Map<string, Positioned<CalendarEvent>[]>();
		for (const day of days) {
			const inDay = events.filter(
				(event) =>
					event.start.getTime() < day.dayEnd.getTime() &&
					event.end.getTime() > day.dayStart.getTime()
			);
			map.set(dayKey(day), computeLanes(inDay));
		}
		return map;
	});

	function dayKey(day: WeekDayColumn): string {
		return String(day.dayStart.getTime());
	}

	function topPx(day: WeekDayColumn, start: Date): number {
		const clamped = Math.max(start.getTime(), day.dayStart.getTime());
		return pxForMinutes((clamped - day.dayStart.getTime()) / 60000, hourHeight);
	}

	function heightPx(day: WeekDayColumn, start: Date, end: Date, min = 18): number {
		const s = Math.max(start.getTime(), day.dayStart.getTime());
		const e = Math.min(end.getTime(), day.dayEnd.getTime());
		return Math.max(min, pxForMinutes((e - s) / 60000, hourHeight));
	}

	function updateNow() {
		const now = DateTime.now().setZone(timezone);
		nowMinutes = now.hour * 60 + now.minute + now.second / 60;
	}

	onMount(() => {
		updateNow();
		const interval = setInterval(updateNow, 30_000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!scrollEl) return;
		const first = days[0];
		const key = `${first?.dayStart.getTime() ?? 0}-${hourHeight}`;
		if (lastScrollKey === key) return;
		lastScrollKey = key;
		let targetMinutes = 8 * 60 - 60;
		const todayColumn = days.find((day) => day.isToday);
		if (todayColumn) {
			const now = DateTime.now().setZone(timezone);
			targetMinutes = now.hour * 60 + now.minute - 120;
		} else if (events.length > 0 && first) {
			const earliest = Math.min(
				...events.map((event) => (event.start.getTime() - first.dayStart.getTime()) / 60000)
			);
			targetMinutes = earliest - 30;
		}
		scrollEl.scrollTop = Math.max(0, pxForMinutes(targetMinutes, hourHeight));
	});

	function handleDragEnd(event: CalendarEvent, offsetY: number) {
		onDragStateChange?.(false);
		dragPos[event.id] = { x: 0, y: 0 };
		const snapped = Math.round(offsetY / snapPx) * snapPx;
		if (snapped === 0) return;
		const deltaMs = (snapped / hourHeight) * 60 * 60 * 1000;
		onEventChange(
			event.id,
			new Date(event.start.getTime() + deltaMs),
			new Date(event.end.getTime() + deltaMs)
		);
	}

	const nowPx = $derived(pxForMinutes(nowMinutes, hourHeight));
	const hasToday = $derived(days.some((day) => day.isToday));
</script>

<div class={cn('relative flex h-full min-h-0 flex-col overflow-hidden', className)}>
	<div bind:this={scrollEl} class="relative h-full w-full overflow-auto">
		<div class="relative w-full">
			<!-- Sticky day headers -->
			<div
				class="sticky top-0 z-20 flex w-full"
				style={`min-width: calc(3.5rem + ${days.length * 130}px);`}
			>
				<div
					class="border-border/70 bg-background sticky left-0 z-30 w-14 shrink-0 border-b"
					aria-hidden="true"
				></div>
				{#each days as day (dayKey(day))}
					<button
						type="button"
						class={cn(
							'border-border/70 bg-background hover:bg-accent/60 flex h-14 min-w-[130px] flex-1 flex-col items-center justify-center gap-1 border-b border-l px-2 transition-colors',
							day.isToday && 'bg-primary/5'
						)}
						title="Bekijk dag"
						onclick={() => onSelectDay(day.date)}
					>
						<span class="flex items-center gap-1.5 leading-none">
							<span
								class={cn(
									'text-[10px] font-medium tracking-wide uppercase',
									day.isToday ? 'text-primary' : 'text-muted-foreground'
								)}
							>
								{day.weekdayShort}
							</span>
							<span
								class={cn(
									'text-sm font-semibold tabular-nums',
									day.isToday ? 'text-primary' : 'text-foreground'
								)}
							>
								{day.dayNumber}
							</span>
						</span>
						<span class="flex w-full max-w-20 items-center gap-1.5">
							<span class="text-muted-foreground text-[9px] leading-none tabular-nums">
								{formatBookedDuration(day.bookedMinutes)}
							</span>
							<span class="bg-muted h-1 flex-1 overflow-hidden rounded-full">
								<span
									class="bg-primary/70 block h-full rounded-full transition-[width] duration-300"
									style={`width: ${occupancyRatio(day.bookedMinutes, day.availableMinutes) * 100}%`}
								></span>
							</span>
						</span>
					</button>
				{/each}
			</div>

			<!-- Body -->
			<div
				class="relative flex w-full"
				style={`height: ${totalHeight}px; min-width: calc(3.5rem + ${days.length * 130}px);`}
			>
				<!-- Time gutter -->
				<div
					class="border-border/70 bg-background sticky left-0 z-10 w-14 shrink-0 border-r"
					aria-hidden="true"
				>
					{#each hours as hour (hour)}
						{#if !hasToday || Math.abs(pxForMinutes(hour * 60, hourHeight) - nowPx) > 14}
							<span
								class="text-muted-foreground absolute right-1.5 text-[11px] tabular-nums"
								style={`top: ${pxForMinutes(hour * 60, hourHeight)}px; transform: translateY(${hour === 0 ? '2px' : '-50%'});`}
							>
								{String(hour).padStart(2, '0')}:00
							</span>
						{/if}
					{/each}
					{#if hasToday}
						<span
							class="text-destructive bg-background absolute right-1 z-20 rounded px-1 text-[10px] font-medium tabular-nums"
							style={`top: ${nowPx}px; transform: translateY(-50%);`}
						>
							{DateTime.now().setZone(timezone).toFormat('HH:mm')}
						</span>
					{/if}
				</div>

				<!-- Day columns -->
				{#each days as day (dayKey(day))}
					{@const dayEvents = eventsByDay.get(dayKey(day)) ?? []}
					<div
						class="border-border/70 relative min-w-[130px] flex-1 border-l"
						style={`background-image: repeating-linear-gradient(to bottom, var(--calendar-grid-line) 0 1px, transparent 1px ${hourHeight}px), repeating-linear-gradient(to bottom, var(--calendar-grid-line-sub) 0 1px, transparent 1px ${snapPx}px);`}
					>
						{#if day.availableMinutes === 0}
							<div class="calendar-offshift pointer-events-none absolute inset-0"></div>
						{/if}

						{#each dayEvents as event (event.id)}
							{@const top = topPx(day, event.start)}
							{@const height = heightPx(day, event.start, event.end)}
							<div
								class="absolute z-[4] px-px"
								style={`top: ${top}px; height: ${height}px; left: calc(${event.laneIndex} * (100% / ${event.lanesTotal})); width: calc(100% / ${event.lanesTotal});`}
								use:draggable={{
									threshold: { distance: 6 },
									position: dragPos[event.id] ?? { x: 0, y: 0 },
									grid: [0, snapPx],
									onDragStart: () => {
										dragPos[event.id] = { x: 0, y: 0 };
										onDragStateChange?.(true);
									},
									onDrag: (e) => {
										dragPos[event.id] = { x: 0, y: e.offsetY };
									},
									onDragEnd: (e) => {
										handleDragEnd(event, e.offsetY);
									}
								}}
							>
								<BookingEditPopover
									{event}
									{services}
									{members}
									{timezone}
									onSave={(id, data) => onEventSave(id, data)}
									onDelete={(id) => onEventDelete(id)}
								>
									<BookingCard
										{event}
										{height}
										{timezone}
										resourceName={event.memberId ? memberName.get(event.memberId) : undefined}
									/>
								</BookingEditPopover>
							</div>
						{/each}

						{#if day.isToday}
							<div
								class="bg-destructive pointer-events-none absolute inset-x-0 z-[8] h-px"
								style={`top: ${nowPx}px;`}
								aria-hidden="true"
							>
								<div class="bg-destructive absolute -top-1 -left-1 h-2 w-2 rounded-full"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.calendar-offshift {
		background-color: var(--calendar-offshift-bg);
		background-image: repeating-linear-gradient(
			45deg,
			var(--calendar-hatch) 0,
			var(--calendar-hatch) 1px,
			transparent 1px,
			transparent 7px
		);
	}
</style>
