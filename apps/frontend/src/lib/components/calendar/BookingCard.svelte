<script lang="ts">
	import { DateTime } from 'luxon';
	import AlignLeft from '@solar-icons/svelte/linear/text-align-left';
	import { bookingStatusIcons, type BookingStatus } from '$lib/booking-status';
	import { t } from '$lib/translation';
	import { cn } from '$lib/utils';
	import type { CalendarEvent } from './types';

	let {
		event,
		height,
		timezone,
		resourceName,
		class: className
	}: {
		event: CalendarEvent;
		height: number;
		timezone: string;
		resourceName?: string;
		class?: string;
	} = $props();

	const palette: Record<string, { bg: string; border: string; text: string }> = {
		PENDING: {
			bg: 'var(--booking-pending-bg)',
			border: 'var(--booking-pending-border)',
			text: 'var(--booking-pending-text)'
		},
		CONFIRMED: {
			bg: 'var(--booking-confirmed-bg)',
			border: 'var(--booking-confirmed-border)',
			text: 'var(--booking-confirmed-text)'
		},
		COMPLETED: {
			bg: 'var(--booking-completed-bg)',
			border: 'var(--booking-completed-border)',
			text: 'var(--booking-completed-text)'
		},
		CANCELLED: {
			bg: 'var(--booking-cancelled-bg)',
			border: 'var(--booking-cancelled-border)',
			text: 'var(--booking-cancelled-text)'
		},
		NEUTRAL: {
			bg: 'var(--booking-neutral-bg)',
			border: 'var(--booking-neutral-border)',
			text: 'var(--booking-neutral-text)'
		}
	};

	const isCancelled = $derived(event.status === 'CANCELLED');
	const colors = $derived(palette[event.status ?? 'NEUTRAL'] ?? palette.NEUTRAL);
	const displayName = $derived(event.customerName || event.title || '(Geen titel)');
	const displayService = $derived(
		event.serviceName || (event.customerName && event.title !== displayName ? event.title : '')
	);
	const timeRange = $derived(
		`${DateTime.fromJSDate(event.start).setZone(timezone).toFormat('HH:mm')} – ${DateTime.fromJSDate(event.end).setZone(timezone).toFormat('HH:mm')}`
	);
	const showTime = $derived(height >= 30);
	const showService = $derived(height >= 46 && !!displayService);
	const showIcons = $derived(height >= 42);
	const showBadge = $derived(isCancelled && height >= 30);
	const StatusIcon = $derived(
		event.status ? bookingStatusIcons[event.status as BookingStatus] : null
	);
</script>

<div
	class={cn(
		'relative h-full w-full overflow-hidden rounded-md border px-1.5 py-1 text-left select-none',
		'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
		className
	)}
	style={`background-color: ${colors.bg}; border-color: ${colors.border}; color: ${colors.text};`}
>
	{#if showBadge}
		<span
			class="absolute top-1 right-1 rounded-full border px-1 text-[9px] leading-[13px] font-medium whitespace-nowrap"
			style={`border-color: ${colors.border}; background-color: var(--background); color: ${colors.text};`}
		>
			{t.database.enums.bookingStatus.CANCELLED}
		</span>
	{/if}

	<div class={cn('flex h-full min-w-0 flex-col', showBadge && 'pr-14')}>
		<p
			class={cn(
				'truncate text-[11px] leading-tight font-semibold',
				isCancelled && 'line-through opacity-70'
			)}
		>
			{displayName}
		</p>

		{#if showService}
			<p class={cn('truncate text-[10px] leading-tight opacity-80', isCancelled && 'line-through')}>
				{displayService}
			</p>
		{/if}

		{#if showTime}
			<p
				class={cn(
					'mt-0.5 truncate text-[10px] leading-tight tabular-nums opacity-75',
					isCancelled && 'line-through'
				)}
			>
				{timeRange}{#if resourceName}<span class="opacity-70"> · {resourceName}</span>{/if}
			</p>
		{/if}
	</div>

	{#if showIcons && (event.notes || StatusIcon)}
		<div class="absolute right-1 bottom-1 flex items-center gap-1 opacity-80">
			{#if event.notes}
				<AlignLeft size={11} aria-label="Notities" />
			{/if}
			{#if StatusIcon && !isCancelled}
				<StatusIcon size={11} aria-label={event.status} />
			{/if}
		</div>
	{/if}
</div>
