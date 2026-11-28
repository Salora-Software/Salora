<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DateTime } from 'luxon';
	import * as Popover from '$lib/components/ui/popover';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Select from '$lib/components/ui/select';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import CalendarCardDatePicker from '$lib/components/CalendarCard-DatePicker.svelte';
	import Calendar from '@solar-icons/svelte/linear/calendar';
	import BriefcaseBusiness from '@solar-icons/svelte/linear/case-minimalistic';
	import UserIcon from '@solar-icons/svelte/linear/user';
	import AlignLeft from '@solar-icons/svelte/linear/text-align-left';
	import CloseIcon from '@solar-icons/svelte/linear/add';
	import CircleCheck from '@solar-icons/svelte/linear/check-circle';
	import Loader from '@solar-icons/svelte/linear/loader';
	import { bookingStatusIcons, bookingStatusColors, type BookingStatus } from '$lib/booking-status';
	import { t } from '$lib/translation';
	import { cn } from '$lib/utils';
	import type { MemberType, ServiceType } from '$lib/trpc';
	import type { BookingEditData, CalendarEvent, SelectionAnchor } from './types';

	let {
		event,
		services = [],
		members = [],
		timezone = 'UTC',
		mode = 'edit',
		open = $bindable(false),
		anchor,
		defaultStatus,
		onSave,
		onCreate,
		onDelete,
		onChange,
		children
	}: {
		event: CalendarEvent;
		services?: ServiceType[];
		members?: MemberType[];
		timezone?: string;
		mode?: 'edit' | 'create';
		open?: boolean;
		anchor?: SelectionAnchor | null;
		defaultStatus?: BookingStatus;
		onSave?: (id: string, data: BookingEditData) => Promise<void> | void;
		onCreate?: (data: BookingEditData) => Promise<void> | void;
		onDelete?: (id: string) => Promise<void> | void;
		onChange?: (data: BookingEditData) => void;
		children: Snippet;
	} = $props();

	function toDateTime(date: Date): DateTime {
		return DateTime.fromJSDate(date).setZone(timezone);
	}

	function baseline(): BookingEditData {
		const creating = mode === 'create';
		return {
			title: event.title ?? '',
			notes: event.notes ?? '',
			status: event.status ?? (creating ? (defaultStatus ?? 'PENDING') : undefined),
			startDate: toDateTime(event.start),
			endDate: toDateTime(event.end),
			serviceId: event.serviceId ?? (creating ? services[0]?.id : undefined),
			memberId: event.memberId ?? (creating ? members[0]?.id : undefined)
		};
	}

	let saving = $state(false);
	let deleting = $state(false);
	let confirmClose = $state(false);
	let titleInput = $state<HTMLInputElement | null>(null);
	let baselineData = $state<BookingEditData>(baseline());
	let editData = $state<BookingEditData>(baseline());
	let lastServiceId = $state<string | undefined>(event.serviceId);
	let sections = $state({
		date: false,
		status: false,
		service: false,
		member: false,
		notes: false
	});

	const isCreate = $derived(mode === 'create');
	const isBooking = $derived(event.kind === 'BOOKING');
	const hasChanges = $derived(
		editData.title !== baselineData.title ||
			editData.notes !== baselineData.notes ||
			editData.status !== baselineData.status ||
			editData.startDate?.toMillis() !== baselineData.startDate?.toMillis() ||
			editData.endDate?.toMillis() !== baselineData.endDate?.toMillis() ||
			editData.serviceId !== baselineData.serviceId ||
			editData.memberId !== baselineData.memberId
	);

	let prevOpen = $state(false);
	let titleTouched = false;
	let lastEmittedStart = -1;
	let lastEmittedEnd = -1;

	$effect(() => {
		if (open && !prevOpen) {
			const initial = baseline();
			baselineData = initial;
			editData = { ...initial };
			lastServiceId = initial.serviceId;
			titleTouched = false;
			lastEmittedStart = -1;
			lastEmittedEnd = -1;
			sections = { date: false, status: false, service: false, member: false, notes: false };
			if (mode === 'edit') {
				setTimeout(() => titleInput?.focus(), 30);
			}
		}
		prevOpen = open;
	});

	$effect(() => {
		if (editData.serviceId === lastServiceId) return;
		lastServiceId = editData.serviceId;
		const selected = services.find((service) => service.id === editData.serviceId);
		if (selected && editData.startDate) {
			editData.endDate = editData.startDate.plus({ minutes: selected.duration });
		}
	});

	// Create mode: prefill the title the same way the booking flow does.
	$effect(() => {
		if (mode !== 'create' || !open || titleTouched) return;
		const service = services.find((s) => s.id === editData.serviceId);
		const title = service?.name ?? '';
		editData.title = title;
		baselineData.title = title;
	});

	// Create mode: reflect the filled-in times back to the grid selection.
	$effect(() => {
		if (mode !== 'create' || !open) return;
		const start = editData.startDate?.toMillis() ?? 0;
		const end = editData.endDate?.toMillis() ?? 0;
		if (start === lastEmittedStart && end === lastEmittedEnd) return;
		lastEmittedStart = start;
		lastEmittedEnd = end;
		onChange?.(editData);
	});

	function requestClose() {
		if (hasChanges) {
			confirmClose = true;
		} else {
			open = false;
		}
	}

	async function save() {
		saving = true;
		try {
			if (mode === 'create') {
				await onCreate?.(editData);
			} else {
				await onSave?.(event.id, editData);
			}
			open = false;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		deleting = true;
		try {
			await onDelete?.(event.id);
			open = false;
		} finally {
			deleting = false;
		}
	}

	const selectedService = $derived(services.find((service) => service.id === editData.serviceId));
	const selectedMember = $derived(members.find((member) => member.id === editData.memberId));
	const statusLabel = $derived(
		editData.status ? t.database.enums.bookingStatus[editData.status] : 'Status toevoegen...'
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="h-full w-full">
		{@render children()}
	</Popover.Trigger>
	<Popover.Content
		class="w-80 p-0"
		sideOffset={8}
		align="start"
		side="bottom"
		customAnchor={anchor ?? undefined}
		onInteractOutside={(e) => {
			if (hasChanges) {
				e.preventDefault();
				confirmClose = true;
			}
		}}
	>
		<div class="flex flex-col">
			<div class="flex items-center justify-between gap-2 px-3 pt-3">
				<input
					bind:this={titleInput}
					bind:value={editData.title}
					oninput={() => (titleTouched = true)}
					class="focus:border-border min-w-0 flex-1 border-0 border-b border-transparent bg-transparent text-sm font-semibold outline-none"
					placeholder="Titel toevoegen"
				/>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground shrink-0"
					onclick={requestClose}
				>
					<CloseIcon size={16} class="rotate-45" />
				</button>
			</div>

			<div class="mt-2 flex flex-col gap-0.5 px-2">
				<div class="grid grid-cols-[28px_1fr] items-start">
					<Calendar size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0">
						{#if sections.date}
							<div class="py-1">
								<CalendarCardDatePicker
									bind:startDate={editData.startDate}
									bind:endDate={editData.endDate}
									bind:timezone
								/>
							</div>
						{:else}
							<button
								type="button"
								class="hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors"
								onclick={() => (sections.date = true)}
							>
								{#if editData.startDate && editData.endDate}
									{editData.startDate.setZone(timezone).toFormat('cccc d MMMM HH:mm')} –
									{editData.endDate.setZone(timezone).toFormat('HH:mm')}
								{:else}
									Geen datum
								{/if}
							</button>
						{/if}
					</div>
				</div>

				{#if isBooking}
					<div class="grid grid-cols-[28px_1fr] items-start">
						<div class="mx-auto mt-1.5">
							{#if editData.status}
								{@const StatusIcon = bookingStatusIcons[editData.status as BookingStatus]}
								<StatusIcon
									size={15}
									class={bookingStatusColors[editData.status as BookingStatus]}
								/>
							{:else}
								<CircleCheck size={15} class="text-muted-foreground" />
							{/if}
						</div>
						<div class="min-w-0">
							{#if sections.status}
								<div class="py-1">
									<Select.Root type="single" bind:value={editData.status}>
										<Select.Trigger class="w-full">
											<span class="truncate text-xs">{statusLabel}</span>
										</Select.Trigger>
										<Select.Content>
											{#each Object.keys(t.database.enums.bookingStatus) as status}
												{@const StatusIcon = bookingStatusIcons[status as BookingStatus]}
												<Select.Item value={status}>
													<span class="inline-flex items-center gap-2">
														<StatusIcon
															size={15}
															class={bookingStatusColors[status as BookingStatus]}
														/>
														{t.database.enums.bookingStatus[
															status as keyof typeof t.database.enums.bookingStatus
														]}
													</span>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{:else}
								<button
									type="button"
									class="hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors"
									onclick={() => (sections.status = true)}
								>
									{statusLabel}
								</button>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-[28px_1fr] items-start">
						<BriefcaseBusiness size={15} class="text-muted-foreground mx-auto mt-2" />
						<div class="min-w-0">
							{#if sections.service}
								<div class="py-1">
									<Select.Root type="single" bind:value={editData.serviceId}>
										<Select.Trigger class="w-full">
											<span class="truncate text-xs"
												>{selectedService?.name || 'Dienst selecteren'}</span
											>
										</Select.Trigger>
										<Select.Content>
											{#each services as service}
												<Select.Item value={service.id}>
													<div class="flex w-full items-center justify-between gap-2">
														<span class="truncate">{service.name}</span>
														<span class="text-muted-foreground shrink-0 text-xs">
															{new Intl.NumberFormat('nl-NL', {
																style: 'currency',
																currency: 'EUR'
															}).format(service.price)} · {service.duration} min
														</span>
													</div>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{:else}
								<button
									type="button"
									class="hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors"
									onclick={() => (sections.service = true)}
								>
									<span class={cn('truncate', !selectedService && 'text-muted-foreground')}>
										{selectedService?.name || 'Dienst selecteren...'}
									</span>
								</button>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-[28px_1fr] items-start">
						<UserIcon size={15} class="text-muted-foreground mx-auto mt-2" />
						<div class="min-w-0">
							{#if sections.member}
								<div class="py-1">
									<Select.Root type="single" bind:value={editData.memberId}>
										<Select.Trigger class="w-full">
											<span class="truncate text-xs"
												>{selectedMember?.user.name || 'Medewerker selecteren'}</span
											>
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
							{:else}
								<button
									type="button"
									class="hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors"
									onclick={() => (sections.member = true)}
								>
									<span class={cn('truncate', !selectedMember && 'text-muted-foreground')}>
										{selectedMember?.user.name || 'Medewerker selecteren...'}
									</span>
								</button>
							{/if}
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-[28px_1fr] items-start">
					<AlignLeft size={15} class="text-muted-foreground mx-auto mt-2" />
					<div class="min-w-0">
						{#if sections.notes}
							<div class="py-1">
								<Textarea
									bind:value={editData.notes}
									placeholder="Notities toevoegen (klant kan dit ook zien)"
									class="h-16 w-full text-xs"
								/>
							</div>
						{:else}
							<button
								type="button"
								class="hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors"
								onclick={() => (sections.notes = true)}
							>
								<span class={cn('truncate', !editData.notes && 'text-muted-foreground')}>
									{editData.notes || 'Notities toevoegen...'}
								</span>
							</button>
						{/if}
					</div>
				</div>
			</div>

			<Separator class="my-2" />
			<div class={cn('flex gap-2 px-3 pb-3', isCreate ? 'justify-end' : 'justify-between')}>
				{#if !isCreate}
					<Button variant="destructive" size="sm" disabled={deleting} onclick={remove}>
						{#if deleting}<Loader size={14} class="mr-1 animate-spin" />{/if}
						Verwijder
					</Button>
				{/if}
				<Button size="sm" disabled={saving} onclick={save}>
					{#if saving}<Loader size={14} class="mr-1 animate-spin" />{/if}
					{isCreate ? 'Aanmaken' : 'Opslaan'}
				</Button>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>

<AlertDialog.Root bind:open={confirmClose}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Weet je zeker dat je wilt sluiten?</AlertDialog.Title>
			<AlertDialog.Description>
				Je hebt niet opgeslagen wijzigingen. Als je doorgaat, gaan deze verloren.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (confirmClose = false)}>Annuleren</AlertDialog.Cancel>
			<Button
				variant="destructive"
				onclick={() => {
					confirmClose = false;
					open = false;
				}}
			>
				Doorgaan
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
