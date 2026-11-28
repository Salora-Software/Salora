<script lang="ts">
	import { DateTime } from 'luxon';
	import type { DateValue } from '@internationalized/date';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import CalendarCardDatePicker from '$lib/components/CalendarCard-DatePicker.svelte';
	import Calendar from '@solar-icons/svelte/linear/calendar';
	import BriefcaseBusiness from '@solar-icons/svelte/linear/case-minimalistic';
	import UserIcon from '@solar-icons/svelte/linear/user';
	import AlignLeft from '@solar-icons/svelte/linear/text-align-left';
	import Plus from '@solar-icons/svelte/linear/add';
	import Loader from '@solar-icons/svelte/linear/loader';
	import { bookingStatusIcons, bookingStatusColors, type BookingStatus } from '$lib/booking-status';
	import { t } from '$lib/translation';
	import { trpcQuery } from '$lib/trpc';
	import type { BranchType } from '$lib/runes.svelte';

	let {
		open = $bindable(false),
		branch,
		timezone = 'UTC',
		selectedDate,
		initialStart,
		initialEnd,
		initialMemberId,
		onSaved
	}: {
		open: boolean;
		branch: BranchType | null;
		timezone?: string;
		selectedDate?: DateValue;
		initialStart?: DateTime;
		initialEnd?: DateTime;
		initialMemberId?: string;
		onSaved?: () => void;
	} = $props();

	const services = $derived(branch?.services || []);
	const members = $derived(
		(branch?.members || []).slice().sort((a, b) => a.user.name.localeCompare(b.user.name))
	);

	const defaultStart = $derived(
		DateTime.fromJSDate(selectedDate ? selectedDate.toDate(timezone) : new Date())
			.setZone(timezone)
			.startOf('day')
			.set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
	);

	let title = $state('');
	let notes = $state('');
	let status = $state<BookingStatus>('PENDING');
	let serviceId = $state('');
	let memberId = $state('');
	let startDate = $state<DateTime>(defaultStart);
	let endDate = $state<DateTime>(defaultStart.plus({ minutes: 30 }));
	let saving = $state(false);
	let prevOpen = $state(false);

	let lastSyncedStart: number | null = null;
	let lastSyncedService: string | null = null;
	let preserveInitialEnd = false;

	function resetForm() {
		title = '';
		notes = '';
		status = 'PENDING';
		serviceId = services[0]?.id || '';
		memberId = initialMemberId || members[0]?.id || '';
		startDate = initialStart ?? defaultStart;
		endDate =
			initialEnd ??
			(initialStart ? initialStart.plus({ minutes: 30 }) : defaultStart.plus({ minutes: 30 }));
		preserveInitialEnd = !!initialEnd;
		lastSyncedStart = null;
		lastSyncedService = null;
	}

	$effect(() => {
		if (open && !prevOpen) {
			resetForm();
		}
		prevOpen = open;
	});

	$effect(() => {
		if (!open) return;
		const selectedService = services.find((s) => s.id === serviceId);
		if (!selectedService?.duration) return;

		const startMs = startDate?.toMillis() ?? 0;
		const isFirstSync = lastSyncedStart === null && lastSyncedService === null;
		if (isFirstSync) {
			lastSyncedStart = startMs;
			lastSyncedService = serviceId;
			if (preserveInitialEnd) return;
			endDate = startDate.plus({ minutes: selectedService.duration });
			return;
		}
		if (startMs === lastSyncedStart && serviceId === lastSyncedService) return;
		lastSyncedStart = startMs;
		lastSyncedService = serviceId;
		endDate = startDate.plus({ minutes: selectedService.duration });
	});

	const upsertCalendarItem = trpcQuery.v2.authenticated.calendar.upsertCalendarItem.createMutation({
		mutationKey: ['createAppointment']
	});

	const selectedService = $derived(services.find((service) => service.id === serviceId));
	const selectedMember = $derived(members.find((member) => member.id === memberId));
	const statusLabel = $derived(t.database.enums.bookingStatus[status]);
	const CurrentStatusIcon = $derived(bookingStatusIcons[status]);

	async function save() {
		if (!branch?.id) return;
		saving = true;
		try {
			await upsertCalendarItem.mutateAsync({
				type: 'BOOKING',
				organizationId: branch.id,
				title: title.trim() || selectedService?.name || 'Nieuwe afspraak',
				notes,
				status,
				startTime: startDate.toJSDate(),
				endTime: endDate.toJSDate(),
				serviceId: serviceId || null,
				memberId: memberId || null
			});
			open = false;
			onSaved?.();
		} finally {
			saving = false;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger class={buttonVariants({ size: 'sm', class: 'h-8 shrink-0 gap-1.5' })}>
		<Plus size={16} />
		<span class="hidden sm:inline">Nieuwe afspraak</span>
		<span class="sm:hidden">Nieuw</span>
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0" align="end" side="bottom" sideOffset={8}>
		<div class="flex max-h-[70vh] flex-col overflow-y-auto">
			<div class="px-3 pt-3">
				<input
					bind:value={title}
					class="focus:border-border w-full border-0 border-b border-transparent bg-transparent text-sm font-semibold outline-none"
					placeholder="Titel toevoegen"
				/>
			</div>

			<div class="mt-2 flex flex-col gap-0.5 px-2">
				<div class="grid grid-cols-[28px_1fr] items-start">
					<Calendar size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0 py-1">
						<CalendarCardDatePicker bind:startDate bind:endDate {timezone} />
					</div>
				</div>

				<div class="grid grid-cols-[28px_1fr] items-start">
					<div class="mx-auto mt-1.5">
						<CurrentStatusIcon size={15} class={bookingStatusColors[status]} />
					</div>
					<div class="min-w-0 py-1">
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger class="w-full">
								<span class="truncate text-xs">{statusLabel}</span>
							</Select.Trigger>
							<Select.Content>
								{#each Object.keys(t.database.enums.bookingStatus) as option}
									{@const StatusIcon = bookingStatusIcons[option as BookingStatus]}
									<Select.Item value={option}>
										<span class="inline-flex items-center gap-2">
											<StatusIcon size={15} class={bookingStatusColors[option as BookingStatus]} />
											{t.database.enums.bookingStatus[
												option as keyof typeof t.database.enums.bookingStatus
											]}
										</span>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-[28px_1fr] items-start">
					<BriefcaseBusiness size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0 py-1">
						<Select.Root type="single" bind:value={serviceId}>
							<Select.Trigger class="w-full">
								<span class="truncate text-xs">{selectedService?.name || 'Dienst selecteren'}</span>
							</Select.Trigger>
							<Select.Content>
								{#each services as service}
									<Select.Item value={service.id}>
										<div class="flex w-full items-center justify-between gap-2">
											<span class="truncate">{service.name}</span>
											<span class="text-muted-foreground shrink-0 text-xs">
												{service.duration} min
											</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-[28px_1fr] items-start">
					<UserIcon size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0 py-1">
						<Select.Root type="single" bind:value={memberId}>
							<Select.Trigger class="w-full">
								<span class="truncate text-xs">{selectedMember?.user.name || 'Medewerker'}</span>
							</Select.Trigger>
							<Select.Content>
								{#each members as member}
									<Select.Item value={member.id}>
										<span class="truncate">{member.user.name}</span>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-[28px_1fr] items-start">
					<AlignLeft size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0 py-1">
						<Textarea
							bind:value={notes}
							placeholder="Notities toevoegen (klant kan dit ook zien)"
							class="h-16 w-full text-xs"
						/>
					</div>
				</div>
			</div>

			<Separator class="my-2" />
			<div class="flex justify-end px-3 pb-3">
				<Button size="sm" disabled={saving || !serviceId} onclick={save}>
					{#if saving}<Loader size={14} class="mr-1 animate-spin" />{/if}
					Aanmaken
				</Button>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
