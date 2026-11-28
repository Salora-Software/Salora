<script lang="ts">
	import { onMount } from 'svelte';
	import { draggable } from '@neodrag/svelte';
	import { DateTime } from 'luxon';
	import { env } from '$env/dynamic/public';
	import * as Avatar from '$lib/components/ui/avatar';
	import { cn } from '$lib/utils';
	import { t } from '$lib/translation';
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
		CalendarResource,
		DragStateHandler,
		EventChangeHandler,
		EventDeleteHandler,
		EventSaveHandler,
		OffShiftBlock
	} from './types';

	let {
		events,
		offShift,
		resources,
		services = [],
		members = [],
		timezone,
		dayStart,
		isToday = false,
		hourHeight = 96,
		class: className,
		onEventChange,
		onEventDelete,
		onEventSave,
		onDragStateChange
	}: {
		events: CalendarEvent[];
		offShift: OffShiftBlock[];
		resources: CalendarResource[];
		services?: ServiceType[];
		members?: MemberType[];
		timezone: string;
		dayStart: Date;
		isToday?: boolean;
		hourHeight?: number;
		class?: string;
		onEventChange: EventChangeHandler;
		onEventDelete: EventDeleteHandler;
		onEventSave: EventSaveHandler;
		onDragStateChange?: DragStateHandler;
	} = $props();

	const totalHeight = $derived(24 * hourHeight);
	const snapPx = $derived(hourHeight / 4);
	const dayEnd = $derived(new Date(dayStart.getTime() + 24 * 60 * 60 * 1000));

	let scrollEl = $state<HTMLDivElement | null>(null);
	let nowMinutes = $state(0);
	let lastScrollKey = '';
	let dragPos = $state<Record<string, { x: number; y: number }>>({});

	const eventsByResource = $derived.by(() => {
		const map = new Map<string, Positioned<CalendarEvent>[]>();
		for (const resource of resources) {
			map.set(
				resource.id,
				computeLanes(events.filter((event) => (event.memberId ?? '__unassigned__') === resource.id))
			);
		}
		return map;
	});

	const offShiftByResource = $derived.by(() => {
		const map = new Map<string, OffShiftBlock[]>();
		for (const block of offShift) {
			const list = map.get(block.memberId) ?? [];
			list.push(block);
			map.set(block.memberId, list);
		}
		return map;
	});

	function statusSegments(resource: CalendarResource) {
		const statusMinutes = resource.statusMinutes;
		return [
			{ key: 'PENDING', minutes: statusMinutes.PENDING, color: 'var(--booking-pending-bar)' },
			{ key: 'CONFIRMED', minutes: statusMinutes.CONFIRMED, color: 'var(--booking-confirmed-bar)' },
			{ key: 'COMPLETED', minutes: statusMinutes.COMPLETED, color: 'var(--booking-completed-bar)' }
		].filter((segment) => segment.minutes > 0);
	}

	function statusTitle(resource: CalendarResource): string {
		const statusMinutes = resource.statusMinutes;
		const parts: string[] = [];
		if (statusMinutes.PENDING) {
			parts.push(
				`${t.database.enums.bookingStatus.PENDING} ${formatBookedDuration(statusMinutes.PENDING)}`
			);
		}
		if (statusMinutes.CONFIRMED) {
			parts.push(
				`${t.database.enums.bookingStatus.CONFIRMED} ${formatBookedDuration(statusMinutes.CONFIRMED)}`
			);
		}
		if (statusMinutes.COMPLETED) {
			parts.push(
				`${t.database.enums.bookingStatus.COMPLETED} ${formatBookedDuration(statusMinutes.COMPLETED)}`
			);
		}
		return parts.join(' · ');
	}

	function topPx(start: Date): number {
		const clamped = Math.max(start.getTime(), dayStart.getTime());
		return pxForMinutes((clamped - dayStart.getTime()) / 60000, hourHeight);
	}

	function heightPx(start: Date, end: Date, min = 18): number {
		const s = Math.max(start.getTime(), dayStart.getTime());
		const e = Math.min(end.getTime(), dayEnd.getTime());
		return Math.max(min, pxForMinutes((e - s) / 60000, hourHeight));
	}

	function updateNow() {
		const now = DateTime.now().setZone(timezone);
		nowMinutes = now.diff(DateTime.fromJSDate(dayStart), 'minutes').minutes;
	}

	onMount(() => {
		updateNow();
		const interval = setInterval(updateNow, 30_000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!scrollEl) return;
		const key = `${dayStart.getTime()}-${hourHeight}`;
		if (lastScrollKey === key) return;
		lastScrollKey = key;
		let targetMinutes = 8 * 60 - 60;
		if (isToday) {
			const mins = DateTime.now()
				.setZone(timezone)
				.diff(DateTime.fromJSDate(dayStart), 'minutes').minutes;
			targetMinutes = mins - 120;
		} else if (events.length > 0) {
			const earliest = Math.min(
				...events.map((event) => (event.start.getTime() - dayStart.getTime()) / 60000)
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
	const hours = $derived(Array.from({ length: 24 }, (_, i) => i));
</script>

<div class={cn('relative flex h-full min-h-0 flex-col overflow-hidden', className)}>
	<div bind:this={scrollEl} class="relative h-full w-full overflow-auto">
		<div class="relative w-full">
			<!-- Sticky employee headers -->
			<div
				class="sticky top-0 z-20 flex w-full"
				style={`min-width: calc(3.5rem + ${resources.length * 150}px);`}
			>
				<div
					class="border-border/70 bg-background sticky left-0 z-30 w-14 shrink-0 border-b"
					aria-hidden="true"
				></div>
				{#each resources as resource (resource.id)}
					<div
						class="border-border/70 bg-background flex h-14 min-w-[150px] flex-1 items-center gap-2 border-b border-l px-2"
					>
						<Avatar.Root class="h-7 w-7 shrink-0 rounded-full">
							<Avatar.Image
								src={resource.avatar ? env.PUBLIC_CDN_URL + resource.avatar : ''}
								alt={resource.name}
							/>
							<Avatar.Fallback
								class="bg-muted text-muted-foreground flex h-full w-full items-center justify-center text-[10px] font-semibold"
							>
								{resource.name
									.split(' ')
									.map((part) => part[0])
									.slice(0, 2)
									.join('')
									.toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs leading-tight font-semibold">{resource.name}</p>
							{#if resource.virtual}
								<p class="text-muted-foreground truncate text-[10px] leading-tight">
									Niet toegewezen
								</p>
							{:else}
								<div class="mt-1 flex items-center gap-1.5" title={statusTitle(resource)}>
									<span class="text-muted-foreground text-[10px] leading-none tabular-nums">
										{formatBookedDuration(resource.bookedMinutes)}
									</span>
									<div class="bg-muted h-1 flex-1 overflow-hidden rounded-full">
										<div
											class="flex h-full overflow-hidden rounded-full"
											style={`width: ${occupancyRatio(resource.bookedMinutes, resource.availableMinutes) * 100}%`}
										>
											{#each statusSegments(resource) as segment (segment.key)}
												<span
													class="h-full"
													style={`flex-grow: ${segment.minutes}; flex-basis: 0; background-color: ${segment.color};`}
												></span>
											{/each}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Body -->
			<div
				class="relative flex w-full"
				style={`height: ${totalHeight}px; min-width: calc(3.5rem + ${resources.length * 150}px);`}
			>
				<!-- Time gutter -->
				<div
					class="border-border/70 bg-background sticky left-0 z-10 w-14 shrink-0 border-r"
					aria-hidden="true"
				>
					{#each hours as hour (hour)}
						{#if !isToday || Math.abs(pxForMinutes(hour * 60, hourHeight) - nowPx) > 14}
							<span
								class="text-muted-foreground absolute right-1.5 text-[11px] tabular-nums"
								style={`top: ${pxForMinutes(hour * 60, hourHeight)}px; transform: translateY(${hour === 0 ? '2px' : '-50%'});`}
							>
								{String(hour).padStart(2, '0')}:00
							</span>
						{/if}
					{/each}
					{#if isToday}
						<span
							class="text-destructive bg-background absolute right-1 z-20 rounded px-1 text-[10px] font-medium tabular-nums"
							style={`top: ${nowPx}px; transform: translateY(-50%);`}
						>
							{DateTime.now().setZone(timezone).toFormat('HH:mm')}
						</span>
					{/if}
				</div>

				<!-- Resource columns -->
				{#each resources as resource (resource.id)}
					{@const resourceEvents = eventsByResource.get(resource.id) ?? []}
					{@const blocks = offShiftByResource.get(resource.id) ?? []}
					<div
						class="border-border/70 relative min-w-[150px] flex-1 border-l"
						style={`background-image: repeating-linear-gradient(to bottom, var(--calendar-grid-line) 0 1px, transparent 1px ${hourHeight}px), repeating-linear-gradient(to bottom, var(--calendar-grid-line-sub) 0 1px, transparent 1px ${snapPx}px);`}
					>
						{#each blocks as block (block.start.getTime())}
							<div
								class="calendar-offshift absolute inset-x-0 rounded-sm"
								style={`top: ${topPx(block.start)}px; height: ${heightPx(block.start, block.end)}px;`}
							></div>
						{/each}

						{#each resourceEvents as event (event.id)}
							{@const top = topPx(event.start)}
							{@const height = heightPx(event.start, event.end)}
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
									<BookingCard {event} {height} {timezone} />
								</BookingEditPopover>
							</div>
						{/each}
					</div>
				{/each}

				<!-- Current time indicator -->
				{#if isToday}
					<div
						class="pointer-events-none absolute top-0 right-0 bottom-0 left-14 z-[8]"
						aria-hidden="true"
					>
						<div class="bg-destructive absolute inset-x-0 h-px" style={`top: ${nowPx}px;`}>
							<div class="bg-destructive absolute -top-1 -left-1 h-2 w-2 rounded-full"></div>
						</div>
					</div>
				{/if}
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
