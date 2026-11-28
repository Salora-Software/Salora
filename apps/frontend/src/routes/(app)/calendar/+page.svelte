<script lang="ts">
	import { getBranchesContext } from '$lib/context/branches-context';
	import {
		AppointmentSheet,
		CalendarToolbar,
		WeekStrip,
		ResourceCalendar,
		WeekCalendar,
		type WeekStripDay,
		type WeekDayColumn,
		type CalendarView,
		type CalendarEvent,
		type CalendarResource,
		type OffShiftBlock,
		type BookingEditData
	} from '$lib/components/calendar';
	import { trpcQuery } from '$lib/trpc.js';
	import { language } from '$lib/translation.js';
	import { DateTime } from 'luxon';
	import { today, getLocalTimeZone, fromDate, type DateValue } from '@internationalized/date';
	import {
		dayBounds,
		weekBounds,
		overlapMinutes,
		clipToRange,
		dayMinutes,
		dateKey
	} from '$lib/components/calendar/time';

	let { data } = $props();
	const queryClient = $derived(data.queryClient);
	const branchesState = getBranchesContext();
	const activeBranch = $derived(branchesState.activeBranch ?? null);
	const timezone = $derived(activeBranch?.timeZone || getLocalTimeZone());

	let selectedDate = $state<DateValue>(today(getLocalTimeZone()));
	let view = $state<CalendarView>('day');
	let createAppointmentOpen = $state(false);
	let cancelRefetching = $state(false);

	const selectedDT = $derived(
		DateTime.fromJSDate(selectedDate.toDate(timezone)).setZone(timezone).startOf('day')
	);
	const week = $derived(weekBounds(selectedDT));
	const day = $derived(dayBounds(selectedDT));
	const isToday = $derived(
		view === 'day'
			? selectedDT.toISODate() === DateTime.now().setZone(timezone).toISODate()
			: week.startDt.toISODate() === DateTime.now().setZone(timezone).startOf('week').toISODate()
	);
	const calendarKey = $derived([
		'getCalendar',
		activeBranch?.id || '',
		dateKey(week.start, timezone)
	]);

	const calendarQuery = $derived(
		trpcQuery.v2.authenticated.calendar.getCalendar.createQuery(
			{
				organizationId: activeBranch?.id || '',
				startDate: week.start,
				endDate: week.end
			},
			{
				queryKey: calendarKey,
				enabled: !!activeBranch,
				refetchInterval: cancelRefetching ? false : 5000
			}
		)
	);

	const roleOrder: Record<string, number> = { owner: 0, admin: 1, employee: 2 };
	const sortedMembers = $derived.by(() => {
		const members = activeBranch?.members ?? [];
		return [...members].sort((a, b) => {
			const roleA = roleOrder[a.role] ?? 99;
			const roleB = roleOrder[b.role] ?? 99;
			if (roleA !== roleB) return roleA - roleB;
			return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
		});
	});

	const rawItems = $derived.by<any[]>(() => {
		const response = calendarQuery.data;
		if (!response) return [];
		return Array.isArray(response) ? response : (response.items ?? []);
	});

	const rawDisabled = $derived.by<any[]>(() => {
		const response = calendarQuery.data;
		if (!response || Array.isArray(response)) return [];
		return response.disabledItems ?? [];
	});

	function memberIdForDisabledEntry(entry: any): string | undefined {
		if (entry.memberId) return entry.memberId;
		return sortedMembers.find((member) => member.user.name === entry.person)?.id;
	}

	function intervalDates(interval: any): { start: Date; end: Date } | null {
		if (!interval?.start || !interval?.end) return null;
		const start = interval.start.toJSDate ? interval.start.toJSDate() : new Date(interval.start);
		const end = interval.end.toJSDate ? interval.end.toJSDate() : new Date(interval.end);
		return { start, end };
	}

	const allEvents = $derived.by<CalendarEvent[]>(() =>
		rawItems.map((item: any) => {
			const kind = (item.type ?? (item.booking ? 'BOOKING' : 'NOTE')) as CalendarEvent['kind'];
			return {
				id: item.id,
				start: new Date(item.startTime),
				end: new Date(item.endTime),
				memberId: item.employee?.id ?? item.booking?.employeeId ?? null,
				title: item.title || item.booking?.service?.name || 'Afspraak',
				customerName: item.booking?.customer?.name ?? undefined,
				serviceName: item.booking?.service?.name ?? undefined,
				serviceId: item.booking?.serviceId ?? undefined,
				status: item.booking?.status ?? undefined,
				notes: item.notes ?? undefined,
				kind
			};
		})
	);

	const dayEvents = $derived(
		allEvents.filter(
			(event) =>
				event.start.getTime() < day.end.getTime() && event.end.getTime() > day.start.getTime()
		)
	);

	const dayOffShift = $derived.by<OffShiftBlock[]>(() => {
		const blocks: OffShiftBlock[] = [];
		for (const entry of rawDisabled) {
			const memberId = memberIdForDisabledEntry(entry);
			if (!memberId) continue;
			for (const interval of entry.date ?? []) {
				const dates = intervalDates(interval);
				if (!dates) continue;
				const clipped = clipToRange(dates.start, dates.end, day.start, day.end);
				if (clipped) blocks.push({ memberId, ...clipped });
			}
		}
		return blocks;
	});

	function offShiftMinutesFor(memberId: string): number {
		return dayOffShift
			.filter((block) => block.memberId === memberId)
			.reduce((sum, block) => sum + (block.end.getTime() - block.start.getTime()) / 60000, 0);
	}

	function bookedMinutesFor(memberId: string | null): number {
		return dayEvents
			.filter((event) => event.memberId === memberId && event.status !== 'CANCELLED')
			.reduce((sum, event) => sum + overlapMinutes(event.start, event.end, day.start, day.end), 0);
	}

	const resources = $derived.by<CalendarResource[]>(() => {
		const list: CalendarResource[] = sortedMembers.map((member) => ({
			id: member.id,
			name: member.user.name,
			avatar: member.user.image ?? undefined,
			bookedMinutes: bookedMinutesFor(member.id),
			availableMinutes: Math.max(0, dayMinutes() - offShiftMinutesFor(member.id))
		}));

		const unassigned = dayEvents.filter((event) => !event.memberId);
		if (unassigned.length > 0) {
			list.push({
				id: '__unassigned__',
				name: 'Niet toegewezen',
				bookedMinutes: bookedMinutesFor(null),
				availableMinutes: 0,
				virtual: true
			});
		}

		return list;
	});

	const weekColumns = $derived.by<WeekDayColumn[]>(() => {
		const todayKey = DateTime.now().setZone(timezone).toISODate();
		return Array.from({ length: 7 }, (_, index) => {
			const dt = week.startDt.plus({ days: index });
			const bounds = dayBounds(dt);
			const key = dt.toISODate();
			const events = allEvents.filter(
				(event) =>
					event.start.getTime() < bounds.end.getTime() &&
					event.end.getTime() > bounds.start.getTime()
			);
			const booked = events
				.filter((event) => event.status !== 'CANCELLED')
				.reduce(
					(sum, event) => sum + overlapMinutes(event.start, event.end, bounds.start, bounds.end),
					0
				);
			let available = 0;
			for (const member of sortedMembers) {
				let closed = 0;
				for (const entry of rawDisabled) {
					if (memberIdForDisabledEntry(entry) !== member.id) continue;
					for (const interval of entry.date ?? []) {
						const dates = intervalDates(interval);
						if (!dates) continue;
						closed += overlapMinutes(dates.start, dates.end, bounds.start, bounds.end);
					}
				}
				available += Math.max(0, dayMinutes() - closed);
			}
			return {
				date: fromDate(dt.toJSDate(), timezone),
				dayStart: bounds.start,
				dayEnd: bounds.end,
				weekdayShort: dt.setLocale(language).toFormat('ccc'),
				dayNumber: dt.day,
				bookedMinutes: booked,
				availableMinutes: available,
				isToday: key === todayKey
			};
		});
	});

	const weekStripDays = $derived.by<WeekStripDay[]>(() => {
		const selectedKey = selectedDT.toISODate();
		return weekColumns.map((column) => ({
			date: column.date,
			weekdayShort: column.weekdayShort,
			dayNumber: column.dayNumber,
			bookedMinutes: column.bookedMinutes,
			availableMinutes: column.availableMinutes,
			isToday: column.isToday,
			isSelected: column.date.toString() === selectedKey
		}));
	});

	function updateItems(updater: (items: any[]) => any[]): (oldData: any) => any {
		return (oldData: any) => {
			if (!oldData) return oldData;
			if (Array.isArray(oldData)) return updater(oldData);
			return { ...oldData, items: updater(oldData.items ?? []) };
		};
	}

	const updateCalendarItem = trpcQuery.v2.authenticated.calendar.updateCalendarItem.createMutation({
		mutationKey: ['updateCalendarItem'],
		onMutate: ({ id, startTime, endTime }) => {
			queryClient.cancelQueries({ queryKey: calendarKey });
			const previousData = queryClient.getQueryData(calendarKey);
			queryClient.setQueryData(
				calendarKey,
				updateItems((items) =>
					items.map((item) => (item.id === id ? { ...item, startTime, endTime } : item))
				)
			);
			return { previousData };
		},
		onError: (err, _vars, context: any) => {
			if (context?.previousData) {
				queryClient.setQueryData(calendarKey, context.previousData);
			}
			console.error('Error updating calendar item:', err);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: calendarKey });
		}
	});

	const deleteCalendarItem = trpcQuery.v2.authenticated.calendar.deleteCalendarItem.createMutation({
		mutationKey: ['deleteCalendarItem'],
		onMutate: ({ id }) => {
			queryClient.cancelQueries({ queryKey: calendarKey });
			const previousData = queryClient.getQueryData(calendarKey);
			queryClient.setQueryData(
				calendarKey,
				updateItems((items) => items.filter((item) => item.id !== id))
			);
			return { previousData };
		},
		onError: (err, _vars, context: any) => {
			if (context?.previousData) {
				queryClient.setQueryData(calendarKey, context.previousData);
			}
			console.error('Error deleting calendar item:', err);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: calendarKey });
		}
	});

	const upsertCalendarItem = trpcQuery.v2.authenticated.calendar.upsertCalendarItem.createMutation({
		mutationKey: ['upsertCalendarItem'],
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: calendarKey });
		}
	});

	async function handleEventChange(id: string, start: Date, end: Date) {
		await updateCalendarItem.mutateAsync({ id, startTime: start, endTime: end });
	}

	async function handleEventDelete(id: string) {
		await deleteCalendarItem.mutateAsync({ id });
	}

	async function handleEventSave(id: string, editData: BookingEditData) {
		if (!activeBranch?.id) return;
		const original = rawItems.find((item) => item.id === id);
		const isBooking = original?.type === 'BOOKING' || !!original?.booking;
		const startTime = editData.startDate?.toJSDate() ?? new Date();
		const endTime = editData.endDate?.toJSDate() ?? new Date();

		if (isBooking) {
			await upsertCalendarItem.mutateAsync({
				type: 'BOOKING',
				id,
				organizationId: activeBranch.id,
				title: editData.title,
				notes: editData.notes,
				status: editData.status ?? 'CONFIRMED',
				startTime,
				endTime,
				serviceId: editData.serviceId ?? null,
				memberId: editData.memberId ?? null
			});
		} else {
			await upsertCalendarItem.mutateAsync({
				type: original?.type ?? 'NOTE',
				id,
				organizationId: activeBranch.id,
				title: editData.title,
				notes: editData.notes,
				startTime,
				endTime
			});
		}
	}

	function goPrev() {
		selectedDate = selectedDate.subtract({ days: view === 'week' ? 7 : 1 });
	}
	function goNext() {
		selectedDate = selectedDate.add({ days: view === 'week' ? 7 : 1 });
	}
	function goToday() {
		selectedDate = today(timezone);
	}
	function pickDate(date: DateValue) {
		selectedDate = date;
	}
	function changeView(next: CalendarView) {
		view = next;
	}
	function openDay(date: DateValue) {
		selectedDate = date;
		view = 'day';
	}
</script>

<div class="flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden">
	<CalendarToolbar
		{selectedDate}
		{timezone}
		{isToday}
		{view}
		onPrev={goPrev}
		onNext={goNext}
		onToday={goToday}
		onPick={pickDate}
		onCreate={() => (createAppointmentOpen = true)}
		onViewChange={changeView}
	/>

	{#if view === 'day'}
		<WeekStrip days={weekStripDays} onSelect={pickDate} />
		<div class="min-h-0 flex-1">
			{#key activeBranch?.id}
				<ResourceCalendar
					events={dayEvents}
					offShift={dayOffShift}
					{resources}
					services={activeBranch?.services ?? []}
					members={activeBranch?.members ?? []}
					{timezone}
					dayStart={day.start}
					{isToday}
					onEventChange={handleEventChange}
					onEventDelete={handleEventDelete}
					onEventSave={handleEventSave}
					onDragStateChange={(dragging) => (cancelRefetching = dragging)}
				/>
			{/key}
		</div>
	{:else}
		<div class="min-h-0 flex-1">
			{#key activeBranch?.id}
				<WeekCalendar
					days={weekColumns}
					events={allEvents}
					services={activeBranch?.services ?? []}
					members={activeBranch?.members ?? []}
					{timezone}
					onSelectDay={openDay}
					onEventChange={handleEventChange}
					onEventDelete={handleEventDelete}
					onEventSave={handleEventSave}
					onDragStateChange={(dragging) => (cancelRefetching = dragging)}
				/>
			{/key}
		</div>
	{/if}
</div>

<AppointmentSheet
	bind:open={createAppointmentOpen}
	branch={activeBranch}
	{selectedDate}
	{queryClient}
	onSaved={() =>
		queryClient.invalidateQueries({ queryKey: ['getCalendar', activeBranch?.id || ''] })}
/>
