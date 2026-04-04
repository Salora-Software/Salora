<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAttributes } from 'svelte/elements';
	import { DateTime } from 'luxon';
	import { type MemberType, type ServiceType } from '$lib/trpc'; // Only needed for upsertCalendar mutation
	type CalendarItem = {
		id?: string;
		start: Date;
		end: Date;
		person: string;
		edit?: boolean;
		overlappingIndex?: number;
		x?: number;
		y?: number;
		status?: keyof typeof t.database.enums.bookingStatus;
		notes?: string;
		title?: string;
		offset?: number;
		serviceId?: string;
		memberId?: string;
	};
	let {
		class: className,
		title,
		time,
		color: color,
		widthOffset,
		height,
		startDate = $bindable(undefined),
		endDate = $bindable(undefined),
		offset,
		index,
		id,
		branchId,
		status = $bindable(undefined),
		timezone = getLocalTimeZone(),
		notes = $bindable(''),
		serviceId = $bindable(undefined),
		memberId = $bindable(undefined),
		ondelete = async () => {},
		oninfo = async () => {},
		onsave = async (editData: EditDataType) => {},
		onUpsertItem = async (item: CalendarItem | undefined) => {},
		services = $bindable([]),
		members = $bindable([]),
		edit = $bindable(false),
		...restProps
	}: {
		class?: string | undefined;
		offset?: number | undefined;
		title?: string | undefined;
		height?: number | undefined;
		color?: string | undefined;
		time?: string | undefined;
		index?: number | undefined;
		id?: string | undefined;
		startDate?: DateTime | undefined;
		endDate?: DateTime | undefined;
		timezone?: string | undefined;
		notes?: string | undefined;
		branchId?: string | undefined;
		status?: keyof typeof t.database.enums.bookingStatus | undefined;
		serviceId?: string | undefined;
		edit?: boolean;
		memberId?: string | undefined;
		ondelete?: () => Promise<void> | void;
		oninfo?: () => Promise<void> | void;
		onsave?: (editData: EditDataType) => Promise<void> | void;
		widthOffset?: number | undefined;
		services?: ServiceType[];
		members?: MemberType[];
		onUpsertItem?: (item: CalendarItem | undefined) => Promise<void>;
	} & WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
	import { cn } from '$lib/utils.js';
	import { BriefcaseBusiness, Calendar, CircleCheck, Clock, PlusIcon } from 'lucide-svelte';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import * as ContextMenu from './ui/context-menu';
	import * as Popover from './ui/popover';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { fade, fly } from 'svelte/transition';
	import Separator from './ui/separator/separator.svelte';
	import Button from './ui/button/button.svelte';
	import { getLocalTimeZone } from '@internationalized/date';
	import { accordion } from './tools/accordion';
	import CalendarCardDatePicker from './CalendarCard-DatePicker.svelte';
	import { Textarea } from './ui/textarea';
	import { t } from '$lib/translation';
	import * as Select from './ui/select';
	let colorConversion = {
		red: {
			border: 'var(--calendar-red-border)',
			background: 'var(--calendar-red-background))'
		},
		blue: {
			border: 'var(--calendar-blue-border)',
			background: 'var(--calendar-blue-background))'
		},
		green: {
			border: 'var(--calendar-green-border)',
			background: 'var(--calendar-green-background))'
		},
		yellow: {
			border: 'var(--calendar-yellow-border)',
			background: 'var(--calendar-yellow-background))'
		},
		purple: {
			border: 'var(--calendar-purple-border)',
			background: 'var(--calendar-purple-background))'
		},
		pink: {
			border: 'var(--calendar-pink-border)',
			background: 'var(--calendar-pink-background))'
		}
	};
	let titleInput: HTMLInputElement | null = $state(null);
	type EditDataType = {
		title: string;
		notes: string;
		status: keyof typeof t.database.enums.bookingStatus | undefined;
		startDate: DateTime | undefined;
		endDate: DateTime | undefined;
		serviceId: string | undefined;
		memberId: string | undefined;
	};
	let editData: EditDataType = $state({
		title: title ?? '',
		notes,
		status,
		startDate,
		endDate,
		serviceId,
		memberId
	});

	// Automatically update end time when service or start time changes
	$effect(() => {
		if (editData.serviceId && editData.startDate && services.length > 0) {
			const selectedService = services.find((s) => s.id === editData.serviceId);
			if (selectedService) {
				// Calculate new end time based on service duration
				const newEndTime = editData.startDate.plus({ minutes: selectedService.duration });
				editData.endDate = newEndTime;
			}
		}
	});

	let showConfirmDialog = $state(false);
	let prevPopoverOpen = false;

	function hasUnsavedChanges() {
		return (
			editData.title !== (title ?? '') ||
			editData.notes !== (notes ?? '') ||
			editData.status !== status ||
			editData.startDate?.toMillis() !== startDate?.toMillis() ||
			editData.endDate?.toMillis() !== endDate?.toMillis() ||
			editData.serviceId !== serviceId ||
			editData.memberId !== memberId
		);
	}
	$effect(() => {
		if (Object.values(context).some((el) => el !== null)) {
			for (const key in context) {
				if (context[key as keyof typeof context] !== null && key.startsWith('_')) {
					const newKey = key.substring(1);
					//check if context[newKey as keyof typeof context] is HTMLButtonElement
					context[newKey as keyof typeof context] =
						// @ts-ignore
						context[key as keyof typeof context]?.offsetHeight || 0;
				}
			}
		}
		if (!isOpen.popover) {
			// set everything to false in isOpen
			for (const key in isOpen) {
				isOpen[key as keyof typeof isOpen] = false;
			}
		}
		// Only reset editData when popover transitions from closed to open
		if (isOpen.popover && !prevPopoverOpen) {
			editData = { title: title ?? '', notes, status, startDate, endDate, serviceId, memberId };
		}
		prevPopoverOpen = isOpen.popover;
	});
	let isOpen = $state({
		date: false,
		description: false,
		service: false,
		member: false,
		status: false,
		popover: false
	});
	let context: {
		date: number | null;
		description: number | null;
		service: number | null;
		member: number | null;
		status: number | null;
		_date: HTMLButtonElement | null;
		_description2: HTMLInputElement | null;
		_description: HTMLButtonElement | null;
		_service: HTMLButtonElement | null;
		_member: HTMLButtonElement | null;
		_status: HTMLButtonElement | null;
	} = $state({
		date: null,
		description: null,
		service: null,
		member: null,
		status: null,
		_date: null,
		_description2: null,
		_description: null,
		_service: null,
		_member: null,
		_status: null
	});
</script>

{#if color}
	<Card.Root
		onclick={() => {
			oninfo();
		}}
		class={cn(
			'relative', // added to enable overlay positioning
			` rounded-0.75 overflow-hidden border-l-4 shadow-lg select-none`,
			className
		)}
		style={`border-left-color: ${
			colorConversion[color as keyof typeof colorConversion].border
		}; background-color: ${colorConversion[color as keyof typeof colorConversion].background}; color: ${
			colorConversion[color as keyof typeof colorConversion].border
		}; border-top: none; border-right: none; border-bottom: none; top: ${offset}px; height: ${height}px;
		width: calc(100% - ${widthOffset}%); ${index ? `z-index: ${index};` : ''};
		${!status || status === 'PENDING' || status === 'CANCELLED' ? 'opacity: 0.5;' : ''}`}
		{...restProps}
	>
		{#if notes}
			<span
				class="absolute top-1 right-1 z-10 flex items-center justify-center rounded-full bg-yellow-500 p-1 text-xs font-bold shadow-md"
				title="Notities aanwezig"
			>
			</span>
		{/if}
		{#if status === 'CANCELLED'}
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div class="w-content absolute inset-0 flex items-center justify-center">
					{#each Array(6) as _, index}
						<span
							class="m-1 ml-[-15px] rotate-[-8deg] transform text-4xl font-semibold text-red-500"
						>
							{t.database.enums.bookingStatus[status].slice(1)}
						</span>
					{/each}
				</div>
			</div>
		{/if}
		<Popover.Root
			bind:open={isOpen.popover}
			onOpenChange={() => {
				new Promise<void>((resolve) => {
					setTimeout(() => {
						resolve();
					}, 5);
				}).then(() => {
					if (titleInput) {
						titleInput.focus();
					}
				});
			}}
		>
			<Popover.Trigger class="h-full w-full">
				<Card.Content
					class={cn(
						'flex h-full w-full items-center justify-between p-0 px-2',
						edit ? 'cursor-grabbing' : 'cursor-pointer'
					)}
				>
					<div class="flex max-w-50 flex-col items-start">
						<h2 class="m-0 truncate p-0 text-xs font-semibold">
							{title || '(Geen titel)'}
						</h2>
						{#if serviceId && services.length > 0}
							{@const selectedService = services.find((s) => s.id === serviceId)}
							{#if selectedService}
								<p class="m-0 truncate p-0 text-left text-xs opacity-75">
									{selectedService.name}
								</p>
							{/if}
						{/if}
					</div>
					<div class="mt-1 flex items-center gap-1">
						<Clock size="14" />
						<p class="text-xs">
							{(startDate ?? DateTime.local().setZone(timezone)).toFormat('HH:mm')}
							-
							{(endDate ?? DateTime.local().setZone(timezone)).toFormat('HH:mm')}
						</p>
					</div>
				</Card.Content>
			</Popover.Trigger>
			<Popover.Content
				sideOffset={8}
				forceMount
				onInteractOutside={(e) => {
					if (hasUnsavedChanges()) {
						e.preventDefault();
						showConfirmDialog = true;
					}
				}}
			>
				{#snippet child({ wrapperProps, props, open })}
					{#if open}
						<div {...wrapperProps}>
							<div
								{...props}
								class={cn(props.class || '', 'flex w-81.25 flex-col items-center px-0 py-3')}
								data-state=""
								transition:fly={{ duration: 80, y: -50 }}
							>
								<div class="mb-2 flex w-full items-center justify-between px-3">
									<div class="w-full max-w-50">
										<h2 class={cn('text-sm', !title ? 'text-gray-500' : '', 'truncate')}>
											{title || '(Geen titel)'}
										</h2>
									</div>
									<button
										onclick={() => {
											if (hasUnsavedChanges()) {
												showConfirmDialog = true;
											} else {
												isOpen.popover = false;
											}
										}}
									>
										<PlusIcon size="16" class="rotate-45 cursor-pointer " />
									</button>
								</div>
								<input
									class="m-0 ml-11.25 border-t-0 border-r-0 border-b-2 border-l-0 text-lg outline-none focus:border-green-200"
									type="text"
									placeholder="Titel toevoegen"
									bind:value={editData.title}
									bind:this={titleInput}
								/>
								<div
									class="mt-4 grid w-full grid-cols-[35px_1fr] px-3 transition-all duration-100 ease-in-out"
								>
									<Calendar size="16" class="mx-auto mt-2.5" />
									<div class="w-full">
										{#if context.date}
											<div
												use:accordion={{
													isOpen: isOpen.date,
													startHeight: context.date || 0
												}}
											>
												<CalendarCardDatePicker
													bind:startDate={editData.startDate}
													bind:endDate={editData.endDate}
													bind:timezone
												/>
											</div>
										{/if}
										{#if !isOpen.date}
											<button
												class="hover:bg-accent hover:text-accent-foreground w-full rounded-md p-2 text-left transition-all duration-100 ease-in-out"
												onclick={() => {
													isOpen.date = true;
												}}
												bind:this={context._date}
											>
												{#if startDate && endDate}
													<span class="text-sm">
														{startDate.toFormat('cccc, d MMMM HH:mm')}
														-
														{endDate.toFormat('HH:mm')}
													</span>
												{:else}
													<span class="text-xs">Geen datum</span>
												{/if}
											</button>
										{/if}
									</div>
								</div>

								<div
									class={cn(
										' grid w-full grid-cols-[35px_1fr] px-3 transition-all duration-100 ease-in-out',
										isOpen.status ? ' mt-2' : ''
									)}
								>
									<div class="mx-auto my-auto">
										{#if editData.status}
											{t.database.enums.bookingStatus[editData.status][0] +
												t.database.enums.bookingStatus[editData.status][1]}
										{:else if status}
											{t.database.enums.bookingStatus[status][0] +
												t.database.enums.bookingStatus[status][1]}
										{:else}
											<CircleCheck size="16" class="" />
										{/if}
									</div>
									<div class="w-full">
										{#if isOpen.status}
											<div
												use:accordion={{
													isOpen: isOpen.status,
													startHeight: context.status || 0
												}}
											>
												<Select.Root type="single" bind:value={editData.status} open={true}>
													<Select.Trigger class={'w-full'}>
														<div class="flex flex-wrap gap-2">
															<h2>
																{editData.status
																	? t.database.enums.bookingStatus[editData.status].slice(1)
																	: 'Status van de afspraak'}
															</h2>
														</div>
													</Select.Trigger>
													<Select.Content>
														{#each Object.keys(t.database.enums.bookingStatus) as status, index}
															<Select.Item value={status} class="w-full">
																{t.database.enums.bookingStatus[
																	status as keyof typeof t.database.enums.bookingStatus
																]}
															</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											</div>
										{/if}
										{#if !isOpen.status}
											<button
												class="hover:bg-accent hover:text-accent-foreground w-full rounded-md p-2 text-left transition-all duration-100 ease-in-out"
												onclick={() => {
													isOpen.status = true;
												}}
											>
												<div class=" overflow-hidden">
													<p
														class={cn(editData.status ? '' : 'text-gray-600', 'truncate text-sm ')}
													>
														{editData.status
															? t.database.enums.bookingStatus[editData.status].slice(1)
															: 'Status toevoegen...'}
													</p>
												</div>
											</button>
										{/if}
									</div>
								</div>
								<div
									class={cn(
										' grid w-full grid-cols-[35px_1fr] px-3 transition-all duration-100 ease-in-out',
										isOpen.service ? ' mt-2' : ''
									)}
								>
									<BriefcaseBusiness size="16" class="mx-auto mt-2.5" />
									<div class="w-full">
										{#if isOpen.service}
											<div
												use:accordion={{
													isOpen: isOpen.service,
													startHeight: context.service || 0
												}}
											>
												<Select.Root type="single" bind:value={editData.serviceId} open={true}>
													<Select.Trigger class="w-full">
														<div class="flex flex-wrap gap-2">
															{#if editData.serviceId}
																{@const selectedService = services.find(
																	(s) => s.id === editData.serviceId
																)}
																<h2>
																	{selectedService?.name || 'Dienst selecteren'}
																</h2>
															{:else}
																<h2 class="text-muted-foreground">Dienst selecteren</h2>
															{/if}
														</div>
													</Select.Trigger>
													<Select.Content>
														{#each services as service}
															<Select.Item value={service.id} class="w-full">
																<div class="flex w-full items-center justify-between">
																	<span>{service.name}</span>
																	<span class="text-muted-foreground ml-2 text-sm">
																		{new Intl.NumberFormat('nl-NL', {
																			style: 'currency',
																			currency: 'EUR'
																		}).format(service.price)} - {service.duration} min
																	</span>
																</div>
															</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											</div>
										{/if}
										{#if !isOpen.service}
											<button
												class="hover:bg-accent hover:text-accent-foreground w-full rounded-md p-2 text-left transition-all duration-100 ease-in-out"
												onclick={() => {
													isOpen.service = true;
												}}
												bind:this={context._service}
											>
												<div class="overflow-hidden">
													{#if editData.serviceId}
														{@const selectedService = services.find(
															(s) => s.id === editData.serviceId
														)}
														<p class="truncate text-sm">
															{selectedService?.name || 'Dienst selecteren'}
														</p>
													{:else}
														<span class="text-muted-foreground text-sm">Dienst selecteren...</span>
													{/if}
												</div>
											</button>
										{/if}
									</div>
								</div>
								<div
									class={cn(
										' grid w-full grid-cols-[35px_1fr] px-3 transition-all duration-100 ease-in-out',
										isOpen.member ? ' mt-2' : ''
									)}
								>
									<!-- User icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="lucide lucide-user mx-auto mt-2.5"
									>
										<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
										<circle cx="12" cy="7" r="4" />
									</svg>
									<div class="w-full">
										{#if isOpen.member}
											<div
												use:accordion={{
													isOpen: isOpen.member,
													startHeight: context.member || 0
												}}
											>
												<Select.Root type="single" bind:value={editData.memberId} open={true}>
													<Select.Trigger class="w-full">
														<div class="flex flex-wrap gap-2">
															{#if editData.memberId}
																{@const selectedMember = members.find(
																	(m) => m.id === editData.memberId
																)}
																<h2>
																	{selectedMember?.user.name || 'Medewerker selecteren'}
																</h2>
															{:else}
																<h2 class="text-muted-foreground">Medewerker selecteren</h2>
															{/if}
														</div>
													</Select.Trigger>
													<Select.Content>
														{#each members as member}
															<Select.Item value={member.id} class="w-full">
																<div class="flex w-full items-center justify-between">
																	<span>{member?.user.name}</span>
																	<span class="text-muted-foreground ml-2 text-sm">
																		{member?.user.email}
																	</span>
																</div>
															</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											</div>
										{/if}
										{#if !isOpen.member}
											<button
												class="hover:bg-accent hover:text-accent-foreground w-full rounded-md p-2 text-left transition-all duration-100 ease-in-out"
												onclick={() => {
													isOpen.member = true;
												}}
												bind:this={context._member}
											>
												<div class="overflow-hidden">
													{#if editData.memberId}
														{@const selectedMember = members.find(
															(m) => m.id === editData.memberId
														)}
														<p class="truncate text-sm">
															{selectedMember?.user.name || 'Medewerker selecteren'}
														</p>
													{:else}
														<span class="text-muted-foreground text-sm"
															>Medewerker selecteren...</span
														>
													{/if}
												</div>
											</button>
										{/if}
									</div>
								</div>
								<div
									class={cn(
										' grid w-full grid-cols-[35px_1fr] px-3 transition-all duration-100 ease-in-out',
										isOpen.description ? ' mt-2' : ''
									)}
								>
									<AlignLeft size="16" class="mx-auto mt-2.5" />
									<div class="w-full">
										{#if context.description}
											<div
												use:accordion={{
													isOpen: isOpen.description,
													startHeight: context.description || 0
												}}
											>
												<Textarea
													placeholder="Notities toevoegen (Klant kan dit ook zien)"
													class=" h-10 max-h-62.5 w-full"
													bind:ref={context._description2}
													disabled={!isOpen.description}
													bind:value={editData.notes}
												/>
											</div>
										{/if}
										{#if !isOpen.description}
											<button
												class="hover:bg-accent hover:text-accent-foreground w-full rounded-md p-2 text-left transition-all duration-100 ease-in-out"
												onclick={() => {
													new Promise<void>((resolve) => {
														setTimeout(() => {
															resolve();
														}, 5);
													}).then(() => {
														if (context?._description2) {
															context._description2.focus();
														}
													});
													isOpen.description = true;
												}}
												bind:this={context._description}
											>
												<div class="max-w-50 overflow-hidden">
													<p class={cn(notes ? '' : 'text-gray-600', 'truncate text-sm ')}>
														{notes || 'Notities toevoegen...'}
													</p>
												</div>
											</button>
										{/if}
									</div>
								</div>

								<Separator class="my-2" />
								<div class="ml flex w-full justify-between gap-4 px-3">
									<Button
										variant="destructive"
										class="w-24"
										onclick={async () => {
											try {
												await ondelete();
												isOpen.popover = false;
											} catch (error) {
												console.error(error);
											}
										}}
									>
										Verwijder
									</Button>
									<Button
										class="w-24"
										onclick={async () => {
											try {
												const item: CalendarItem = {
													id,
													start: editData.startDate?.toJSDate() || new Date(),
													end: editData.endDate?.toJSDate() || new Date(),
													person: editData.memberId || '',
													title: editData.title,
													notes: editData.notes,
													status: editData.status,
													serviceId: editData.serviceId,
													memberId: editData.memberId
												};

												await onUpsertItem(item);

												title = editData.title;
												notes = editData.notes;
												status = editData.status;
												startDate = editData.startDate;
												endDate = editData.endDate;
												serviceId = editData.serviceId;
												memberId = editData.memberId;
												isOpen.popover = false;
											} catch (error) {
												console.error(error);
											}
										}}
									>
										Opslaan
									</Button>
								</div>
							</div>
						</div>
					{/if}
				{/snippet}
			</Popover.Content>
		</Popover.Root>
	</Card.Root>
{/if}

<AlertDialog.Root bind:open={showConfirmDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Weet je zeker dat je wilt sluiten?</AlertDialog.Title>
			<AlertDialog.Description>
				Je hebt niet opgeslagen wijzigingen. Als je doorgaat, gaan deze verloren.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel
				onclick={() => {
					showConfirmDialog = false;
				}}>Annuleren</AlertDialog.Cancel
			>
			<Button
				variant="destructive"
				onclick={() => {
					showConfirmDialog = false;
					isOpen.popover = false;
				}}
			>
				Doorgaan
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
