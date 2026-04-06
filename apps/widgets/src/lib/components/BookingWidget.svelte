<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/';
	import { Clock, CreditCard, LoaderCircle, ShoppingBag, UserRound } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import * as Avatar from '$lib/components/ui/avatar/';
	import { language } from '$lib/translation';
	import BookingSidebar from './BookingSidebar.svelte';
	import AppointmentStep from './steps/AppointmentStep.svelte';
	import ContactStep from './steps/ContactStep.svelte';
	import PaymentStep from './steps/PaymentStep.svelte';
	import SuccessStep from './steps/SuccessStep.svelte';
	import {
		loadOccupancy,
		loadDayAvailability,
		createBooking,
		validateBookingStep,
		saveContactToLocalStorage,
		loadContactFromLocalStorage,
		type BookingValues,
		type BookingButton
	} from '$lib/booking-utils.js';
	import { tick } from 'svelte';
	import type { RouterOutput } from '@salora/trpc-types';
	import { DateTime, type Interval } from 'luxon';
	import ScrollArea from './ui/scroll-area/scroll-area.svelte';
	import type { Attachment } from 'svelte/attachments';

	// Calendar value for binding
	let calendarValue = $state<DateValue | undefined>(undefined);

	$effect(() => {
		// Sync from bookingState to local value
		if (bookingState.date.calendarValue !== calendarValue) {
			calendarValue = bookingState.date.calendarValue;
		}
	});

	$effect(() => {
		// Sync from local value to bookingState
		if (calendarValue !== bookingState.date.calendarValue) {
			bookingState.date.calendarValue = calendarValue;
		}
	});

	interface Props {
		branch: RouterOutput['v1']['getBranch'];
		collapsed?: boolean;
		cardWidth?: number;
		onCollapsedChange?: (collapsed: boolean) => void;
	}

	let { branch, collapsed = $bindable(false), cardWidth = $bindable(0) }: Props = $props();

	const monthOptions = [
		'Januari',
		'Februari',
		'Maart',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Augustus',
		'September',
		'Oktober',
		'November',
		'December'
	].map((month, i) => ({ value: String(i + 1), label: month }));

	let bookingState = $state<BookingValues>({
		appointment: {
			value: '',
			employeeId: ''
		},
		date: {
			loading: false,
			placeholder: undefined,
			calendarValue: undefined,
			timeValue: undefined as Interval | undefined
		},
		contact: {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			notes: ''
		}
	});

	let bookingSteps = $state<BookingButton[]>([
		{
			icon: ShoppingBag,
			name: 'Afspraak',
			description: () =>
				branch?.services.find((service: any) => service.id === bookingState.appointment.value)
					?.name || '',
			active: false,
			selected: true,
			onNext: async () => {
				if (!validateBookingStep('Afspraak', bookingState)) {
					return false;
				}
				if (!bookingSteps.find((step) => step.name === 'Betaling')) {
					bookingSteps = [
						...bookingSteps,
						{
							icon: CreditCard,
							name: 'Betaling',
							description: '',
							active: false,
							selected: false,
							onNext: async () => true
						}
					];
				}

				occupancyData = await loadOccupancy(
					new Date().getFullYear(),
					new Date().getMonth() + 1,
					bookingState.appointment.value,
					branch?.id,
					branch?.timeZone || getLocalTimeZone()
				);
				return true;
			}
		},
		{
			icon: Clock,
			name: 'Datum & Tijd',
			description: () =>
				bookingState.date.calendarValue && bookingState.date.timeValue
					? `${DateTime.fromJSDate(bookingState.date.calendarValue.toDate(branch?.timeZone || 'utc')).toFormat('yyyy-MM-dd')}, ${bookingState.date.timeValue?.start?.toFormat('HH:mm')} - ${bookingState.date.timeValue?.end?.toFormat('HH:mm')}`
					: '',
			active: false,
			selected: false,
			onNext: async () => validateBookingStep('Datum & Tijd', bookingState)
		},
		{
			icon: UserRound,
			name: 'Jouw informatie',
			description: '',
			active: false,
			selected: false,
			onNext: async () => {
				if (!validateBookingStep('Jouw informatie', bookingState)) {
					return false;
				}
				saveContactToLocalStorage(bookingState.contact);
				return true;
			}
		}
	]);

	let minSelectableDate = $derived(
		today(getLocalTimeZone()).add({
			days: (branch?.minimumBookingTime % 24) - 1
		})
	);
	let maxSelectableDate = $derived(today(getLocalTimeZone()).add({ days: branch.bookingPeriod }));
	let occupancyData = $state<RouterOutput['appointment']['getOccupancy'] | undefined>(undefined);
	let availabilityData = $state<RouterOutput['appointment']['getAvailability'] | undefined>(
		undefined
	);

	let selectedService = $derived(
		branch?.services.find((service: any) => service.id === bookingState.appointment.value)
	);

	// Reinvented: Get timeslots for a specific date (no caching)
	function getTimeSlotsForDate(date: DateValue) {
		if (!availabilityData) return [];
		return availabilityData.slots.map((slot) => ({
			interval: slot.interval,
			start: slot.interval.start,
			end: slot.interval.end,
			available: slot.available
		}));
	}

	function isDateDisabled(date: DateValue): boolean {
		if (bookingState.date.loading) return true;
		if (date.compare(minSelectableDate) < 0) return true;
		if (!occupancyData) return false;

		const dayMetric = occupancyData.days.find((d) => d.date === date.toString());
		return !dayMetric || !dayMetric.available;
	}

	let isLoadingNextStep = $state(false);
	async function goToStep(index: number, check: boolean = true) {
		if (!branch) return;
		if (index === 0) {
			resetWidget();
			return;
		}

		let selectedStep = bookingSteps.find((step) => step.selected);
		if (check && selectedStep?.onNext) {
			if (!(await selectedStep.onNext())) {
				toast.error('Vul alle velden in');
				return;
			}
		}

		selectedStep = bookingSteps[index];
		if (!selectedStep) {
			const result = await createBooking(bookingState, branch);
			if (!result.success) {
				bookingSteps = bookingSteps.map((step, i) => ({
					...step,
					active: i !== bookingSteps.length - 1,
					selected: i === bookingSteps.length - 1
				}));
				return;
			}

			if (result.employeeId) {
				bookingState.appointment.employeeId = result.employeeId;
			}
			bookingSteps = bookingSteps.map((step, i) => ({
				...step,
				active: true,
				selected: false
			}));
			collapsed = true;
			return;
		}

		bookingSteps = bookingSteps.map((step, i) => ({
			...step,
			active: i < index,
			selected: i === index
		}));
	}

	onMount(() => {
		const storedContact = loadContactFromLocalStorage();
		if (storedContact) {
			bookingState.contact = storedContact;
		}
	});

	export function resetWidget() {
		collapsed = false;
		bookingSteps = bookingSteps.map((step, i) => ({
			...step,
			active: false,
			selected: i === 0
		}));
		availabilityData = undefined;
		occupancyData = undefined;
	}
	let innerWidth = $state(500);
	let isMobile = $derived(innerWidth < 500);

	function getPercentageBooked(date: DateValue): number {
		if (!occupancyData) return 0;
		const dayData = occupancyData.days.find((d) => d.date === date.toString());
		return dayData ? dayData.occupancyPercentage : 0;
	}

	function updateCardWidth(): Attachment {
		return (element) => {
			if (element) {
				const resizeObserver = new ResizeObserver((entries) => {
					for (let entry of entries) {
						if (!collapsed) cardWidth = entry.contentRect.width;
					}
				});
				resizeObserver.observe(element);

				return () => {
					resizeObserver.unobserve(element);
				};
			}
		};
	}
</script>

<svelte:window bind:innerWidth />
<div
	class={cn(
		`widget-container animationContainer grid h-full w-full grid-cols-1 grid-rows-[1fr] overflow-hidden max-w-content`
	)}
>
	{#if !collapsed && !isMobile}
		<BookingSidebar {bookingSteps} {branch} onButtonClick={(index) => goToStep(index, false)} />
	{/if}
	<div
		class={cn(
			'widget-content right col-start-1 row-start-1 ml-auto w-[65%]',
			collapsed ? 'rounded-[5px]! p-0 w-full!' : '',
			isMobile ? 'w-full!' : ''
		)}
		style:max-width={collapsed ? `${cardWidth}px` : '100%'}
		{@attach updateCardWidth()}
	>
		{#if bookingSteps.find((step) => step.selected)}
			{@const selectedStep = bookingSteps.find((step) => step.selected)}
			{@const index = selectedStep ? bookingSteps.indexOf(selectedStep) : -1}

			<div
				class={cn('grid h-full grid-rows-[1fr_auto]', isMobile ? 'grid-rows-[auto_1fr_auto]' : '')}
			>
				{#if isMobile}
					<!-- Progress Bar for Mobile -->
					<div class="w-full">
						<div
							class="bg-widget-accent/20 dark:bg-widget-accent/30 relative h-2 w-full overflow-hidden"
						>
							<div
								class="bg-widget-accent absolute left-0 top-0 h-full transition-all duration-300"
								style="width: {((index + 1) / bookingSteps.length) * 100}%"
							></div>
						</div>
					</div>
				{/if}
				<div>
					<div class="flex-between flex w-full px-4 pt-4">
						<h1 class="text-xl">{selectedStep?.name}</h1>
						<a
							href="https://salora.app"
							target="_blank"
							rel="noopener noreferrer"
							class="widget-content-text-muted ml-auto flex flex-col items-end"
						>
							<span class="ml-auto text-[0.6rem] leading-tight">POWERED BY </span>
							<p class="w-max text-sm font-bold">Salora</p>
						</a>
					</div>
					<div class="px-4">
						<Separator class="my-2 " />
						{#if selectedStep?.name == 'Afspraak'}
							<AppointmentStep
								bind:bookingState
								{branch}
								onServiceChange={() => {
									availabilityData = undefined;
								}}
							/>
						{:else if selectedStep?.name == 'Medewerker'}
							<Label class="text-widget-content-text mb-2">Kies een medewerker</Label>
							<div class="flex flex-wrap items-center justify-center gap-4">
								{#each branch.members as employee}
									<div class="flex flex-col items-center gap-2">
										<Avatar.Root class="h-[64px] w-[64px] rounded-[5px]">
											<Avatar.Image src="/images/user.svg" alt="@shadcn" />
											<Avatar.Fallback>
												<img src="/images/placeholder-small.svg" alt="" />
											</Avatar.Fallback>
										</Avatar.Root>
										<h1>
											{employee.user.name}
										</h1>
									</div>
								{/each}
								<div class="flex flex-col items-center gap-2">
									<Avatar.Root class="h-[64px] w-[64px] rounded-[5px]">
										<Avatar.Image src="/images/user.svg" alt="@shadcn" />
										<Avatar.Fallback>
											<img src="/images/placeholder-small.svg" alt="" />
										</Avatar.Fallback>
									</Avatar.Root>
									<h1>Geen voorkeur</h1>
								</div>
							</div>
						{:else if selectedStep?.name == 'Datum & Tijd'}
							<ScrollArea
								id="calendar-scroll-area"
								class="h-[349px] [&>[data-scroll-area-scrollbar]]:!fixed [&>[data-scroll-area-scrollbar]]:!right-[2px] [&>[data-scroll-area-scrollbar]]:py-[2.5px]"
							>
								<Calendar
									type="single"
									{isDateDisabled}
									locale={language}
									notAvailable={!occupancyData?.days.some((d) => d.available)}
									minValue={minSelectableDate}
									maxValue={maxSelectableDate}
									captionLayout="dropdown"
									bind:loading={bookingState.date.loading}
									bind:value={bookingState.date.calendarValue}
									bind:placeholder={bookingState.date.placeholder}
									{getPercentageBooked}
									onValueChange={async (value) => {
										if (!value) return;
										bookingState.date.loading = true;
										const luxonDate = DateTime.fromJSDate(
											value.toDate(branch?.timeZone || 'utc')
										).setZone(branch?.timeZone || 'utc', { keepLocalTime: true });

										availabilityData = await loadDayAvailability(
											luxonDate,
											bookingState.appointment.value,
											branch?.id
										);
										bookingState.date.loading = false;

										await tick();
										const scrollArea = document.getElementById('calendar-scroll-area');
										if (scrollArea) {
											const viewport = scrollArea.querySelector('[data-scroll-area-viewport]');
											if (viewport) {
												viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
											} else {
												scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
											}
										}
									}}
									onPlaceholderChange={async (value) => {
										const { year, month } = value;
										bookingState.date.loading = true;
										if (
											!bookingState.date.calendarValue ||
											bookingState.date.calendarValue.year !== year ||
											bookingState.date.calendarValue.month !== month
										) {
											bookingState.date.calendarValue = undefined;
										}
										occupancyData = await loadOccupancy(
											year,
											month,
											bookingState.appointment.value,
											branch?.id,
											branch?.timeZone || 'utc'
										);
										bookingState.date.loading = false;
									}}
								/>
								{#if bookingState.date.calendarValue}
									<h3 class="my-2">
										{DateTime.fromJSDate(
											bookingState.date.calendarValue.toDate(branch?.timeZone || 'utc')
										)
											.setLocale(language)
											.toFormat('cccc, dd MMMM yyyy')}
									</h3>
									<div class="mb-2 grid grid-cols-2 gap-2">
										{#each getTimeSlotsForDate(bookingState.date.calendarValue).sort((a, b) => (a.start?.toMillis() || 0) - (b.start?.toMillis() || 0)) as slot}
											<button
												disabled={!slot.available}
												class:bg-widget-time-slot-selected={bookingState.date.timeValue?.equals(
													slot.interval
												)}
												class:text-white={bookingState.date.timeValue?.equals(slot.interval)}
												onclick={() => {
													if (!slot.available) return;
													if (slot.interval.isValid) {
														bookingState.date.timeValue = slot.interval;
														goToStep(index + 1, false);
													}
												}}
												class="border-widget-input-border text-widget-content-text bg-widget-time-slot-bg hover:bg-widget-time-slot-hover h-10 w-full rounded-md border transition-all duration-100 disabled:cursor-not-allowed disabled:border-none disabled:!bg-transparent disabled:hover:bg-transparent"
											>
												{slot.start?.setZone(branch?.timeZone || 'utc').toFormat('HH:mm')} - {slot.end
													?.setZone(branch?.timeZone || 'utc')
													.toFormat('HH:mm')}
											</button>
										{/each}
									</div>
								{/if}
							</ScrollArea>
						{:else if selectedStep?.name == 'Jouw informatie'}
							<ContactStep bind:bookingState />
						{:else if selectedStep?.name == 'Betaling'}
							<PaymentStep {bookingState} {branch} />
						{/if}
					</div>
				</div>
				<div class="px-4 pb-4 text-right">
					<Separator class="my-2 " />
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="widget-error text-sm">*</span>
							<p class="widget-content-text text-sm">Verplicht</p>
						</div>
						<div class="flex gap-2">
							<Button
								class="widget-button ml-auto "
								disabled={index === 0}
								onclick={() => goToStep(index - 1, false)}>Terug</Button
							>
							<Button
								class="widget-button ml-auto w-[94px]"
								disabled={isLoadingNextStep}
								onclick={async () => {
									isLoadingNextStep = true;
									try {
										await goToStep(index + 1);
									} finally {
										isLoadingNextStep = false;
									}
								}}
							>
								{#if !isLoadingNextStep}
									volgende
								{:else}
									<LoaderCircle class="animate-spin text-white" size="20" />
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<SuccessStep {bookingState} {branch} {resetWidget} />
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: transparent !important;
	}
	:global(html) {
		color-scheme: light !important;
	}

	.precentageBooked::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: var(--percentageBooked);
		z-index: 0;
		pointer-events: none;
		border-radius: 0 0 6px 6px;
		background-color: rgba(255, 255, 255, 0.3);
	}

	.left {
		border-radius: var(--widget-border-radius) 0 0 var(--widget-border-radius);
	}
	.right {
		border-radius: 0 var(--widget-border-radius) var(--widget-border-radius) 0;
		z-index: 1;
	}
	.animationContainer > div {
		grid-row: 1;
		grid-column: 1;
	}
	:global(.dayCalendar[data-today]) {
		position: relative;
	}

	:global(.dayCalendar[data-today]) {
		position: relative;
	}

	:global(.dayCalendar[data-today]::before) {
		content: '';
		position: absolute;
		top: 2px;
		left: 50%;
		transform: translateX(-50%);
		width: 5px;
		height: 5px;
		background-color: var(--widget-accent);
		border-radius: 50%;
		transition: background-color 0.2s;
	}
	:global(.dayCalendar[data-today]:hover:not([data-selected])::before) {
		background-color: var(--widget-accent-hover);
	}

	/* Make disabled timeslots look more disabled */
	:global(button[disabled].bg-widget-time-slot-bg) {
		background-color: #e5e7eb !important; /* Tailwind gray-200 */
		color: #9ca3af !important; /* Tailwind gray-400 */
		opacity: 0.7;
		cursor: not-allowed !important;
		border: 1px solid #e5e7eb !important;
		box-shadow: none !important;
	}
</style>
