<script lang="ts">
	// Configurable hour height (in px)
	let hourHeight = 100;
	// Import UI components (only used ones)
	import * as Card from '$lib/components/ui/card/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { cn } from '$lib/utils.js';
	import { LoaderCircle } from 'lucide-svelte';
	import CalendarCard from './CalendarCard.svelte';
	import { onMount } from 'svelte';
	import { draggable } from '@neodrag/svelte';
	// Import date utilities
	import { DateFormatter, fromDate, type DateValue } from '@internationalized/date';
	import { fly } from 'svelte/transition';
	import { PUBLIC_CDN_URL } from '$env/static/public';
	import * as Avatar from './ui/avatar';
	import moment from 'moment-timezone';
	import { DateTime, Interval } from 'luxon';
	import { language, t } from '$lib/translation';
	import { trpc, type MemberType, type ServiceType } from '$lib/trpc';
	import { browser } from '$app/environment';
	// Bindable props with defaults and types
	let {
		class: className,
		selectedDate = $bindable(),
		people = $bindable([]),
		loading = $bindable(true),
		disabledItems = $bindable([]),
		getCalendarItems = $bindable((date) => Promise.resolve([])),
		onItemChange = $bindable((item, hourHeight) => Promise.resolve()),
		onItemDelete = $bindable((item) => Promise.resolve()),
		onMoveItem = $bindable((item, hourHeight) => Promise.resolve()),
		onMoveItemEnd = $bindable((item, hourHeight) => Promise.resolve()),
		timezone = $bindable('UTC'),
		...restProps
	}: {
		class?: string | undefined;
		people:
			| {
					name: string;
					color?: string;
					avatar?: string | undefined;
			  }[]
			| undefined;
		selectedDate?: DateValue | undefined;
		name?: string | undefined;
		title?: string | undefined;
		description?: string | undefined;
		loading?: boolean | undefined;
		branchId?: string | undefined;
		services: ServiceType[];
		members: MemberType[];

		icon?: ConstructorOfATypedSvelteComponent | undefined;
		timezone?: string | undefined;
		disabledItems: {
			person: string;
			type: 'date' | 'repeated-date';
			date: Interval[];
		}[];
		onMoveItem?: (
			item: (typeof calendarItems)[number] | undefined,
			hourHeight: number
		) => Promise<void>;
		onMoveItemEnd?: (
			item: (typeof calendarItems)[number] | undefined,
			hourHeight: number
		) => Promise<void>;
		getCalendarItems?: (date: DateValue) =>
			| Promise<
					{
						start: Date;
						end: Date;
						person: string;
						title?: string;
						status?: keyof typeof t.database.enums.bookingStatus;
						notes?: string;
						id: string;
					}[]
			  >
			| undefined;
		onItemChange?: (
			item: (typeof calendarItems)[number] | undefined,
			hourHeight: number
		) => Promise<void>;
		onItemDelete?: (item: (typeof calendarItems)[number] | undefined) => Promise<void>;
		onUpsertItem?: (item: (typeof calendarItems)[number] | undefined) => Promise<void>;
	} = $props();
	let edited: Record<string, boolean> = $state({});

	// Generate formatted hours for display – creates an array [00:00 ... 23:00]
	let formattedHours = Array.from({ length: 24 }, (_, i) => {
		let formattedHour = i.toString().padStart(2, '0');
		return { formated: `${formattedHour}:00`, date: new Date(`1970-01-01T${formattedHour}:00`) };
	});
	// Calendar items storage
	let calendarItems: {
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
	}[] = $state([]);
	function getSelectedTime(referenceDate: DateValue = selectedDate!): Date {
		const response = moment(referenceDate.toDate(timezone))
			.tz(timezone)
			.startOf('day') // This sets the time to 00:00:00.000 in the specified timezone
			.toDate();
		return response;
	}
	function calculateDateTimeDate(time: Date, offset: number): DateTime {
		const offsetNew = offset / hourHeight;
		return DateTime.fromJSDate(new Date(time.getTime() + offsetNew * 60 * 60 * 1000), {
			zone: timezone
		}).setLocale(language);
	}

	function parseIntervalToCorrectType(interval: Interval[], type: 'date' | 'repeated-date') {
		if (!Array.isArray(interval)) return [];
		if (type === 'date') {
			return interval;
		} else if (type === 'repeated-date') {
			return interval.map((int) => {
				if (int.start && int.end) {
					const newStart = int.start.set({
						year: selectedDate?.year,
						month: selectedDate?.month,
						day: selectedDate?.day
					});
					const newEnd = int.end.set({
						year: selectedDate?.year,
						month: selectedDate?.month,
						day: selectedDate?.day
					});
					return Interval.fromDateTimes(newStart, newEnd);
				}
				throw new Error('Interval start or end is null');
			});
		}
		throw new Error('Invalid type provided');
	}
	// Calculates offset from a time string in 'HH:mm' format.
	function calculateOffset(time: Date, referenceDate: DateValue = selectedDate!): number {
		if (!selectedDate) throw new Error('Selected date is not defined');
		let viewDate = getSelectedTime(referenceDate);
		if (!viewDate) throw new Error('Selected date is not defined');
		//calculate the amount of difference between time and viewDate format this as hours
		const hours = (time.getTime() - viewDate.getTime()) / (1000 * 60 * 60);

		return hours * hourHeight;
	}

	// Update current time offset used for time indicator scrolling.
	let currentTimeOffset = $state(0);
	let currentTime = $state('');
	let currentHour = $state(new Date().getHours());
	let currentMinute = $state(new Date().getMinutes());
	let previousDate = $state<DateValue | undefined>();

	let timeIndicator = $derived(
		selectedDate && selectedDate.toDate(timezone).toDateString() === new Date().toDateString()
	);
	let refresh = $state(false);

	function updateCurrentTimeOffset() {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		currentTimeOffset = hours * hourHeight + (minutes / 60) * hourHeight;
	}

	// Updates the display time string.
	function updateCurrentTime() {
		const now = new Date();
		currentTime = now.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: timezone
		});
	}

	// Get the amount of overlapping items for a given item for calendarItems. So with the dates.
	function getOverlappingItems(item: typeof calendarItems, start: Date, end: Date) {
		let overlappingItems = 0;
		for (let i = 0; i < item.length; i++) {
			const startTime = new Date(item[i].start.getTime() + ((item[i].offset || 0) / 80) * 3600000);
			const endTime = new Date(item[i].end.getTime() + ((item[i].offset || 0) / 80) * 3600000);
			const startTimeToCheck = start;
			const endTimeToCheck = end;
			if (
				(startTime > startTimeToCheck && startTime < endTimeToCheck) ||
				(endTime > startTimeToCheck && endTime < endTimeToCheck) ||
				(startTimeToCheck > startTime && startTimeToCheck < endTime) ||
				(endTimeToCheck > startTime && endTimeToCheck < endTime) ||
				(endTimeToCheck.getTime() === endTime.getTime() &&
					startTimeToCheck.getTime() === startTime.getTime())
			) {
				overlappingItems++;
			}
		}
		return overlappingItems;
	}

	// Sync the current hour and minute values.
	function updateCurrentHourAndMinute() {
		const now = new Date();
		currentHour = now.getHours();
		currentMinute = now.getMinutes();
	}

	// Set the overlapping index for each calendar item.
	function setOverlappingIndex() {
		calendarItems = calendarItems.sort((a, b) => {
			const offsetA = a.offset || (0 / hourHeight) * 3600000;
			const offsetB = b.offset || (0 / hourHeight) * 3600000;
			return a.start.getTime() + offsetA - (b.start.getTime() + offsetB);
		});
		calendarItems.forEach((item, i) => {
			const start = new Date(item.start.getTime() + ((item.offset || 0) / hourHeight) * 3600000);
			const end = new Date(item.end.getTime() + ((item.offset || 0) / hourHeight) * 3600000);
			// Filter previous items with the same person
			const samePersonItems = calendarItems
				.slice(0, i)
				.filter((prevItem) => prevItem.person === item.person);
			item.overlappingIndex = getOverlappingItems(samePersonItems, start, end);
		});
	}
	// Fetch calendar items for a given date.
	async function updateCalendarItems(loader = true) {
		//return if branchId is not set
		if (!restProps.branchId) return;
		let savedSelectedDate = selectedDate || fromDate(new Date(), timezone);
		if (savedSelectedDate) {
			const updatedCalendarItems = await getCalendarItems(savedSelectedDate);
			if (!updatedCalendarItems) return;
			calendarItems = updatedCalendarItems;

			updateCurrentTime();
			setOverlappingIndex();
		}
	}

	updateCurrentTimeOffset();

	function updateItem(item: (typeof calendarItems)[number]) {
		setOverlappingIndex();
		refresh = true;

		onItemChange(item, hourHeight)
			.then(() => {
				refresh = false;
			})
			.catch((error) => {
				console.error('Error updating item:', error);
				refresh = false;
			});
	}

	function deleteItem(item: (typeof calendarItems)[number]) {
		refresh = true;
		onItemDelete(item)
			.then(() => {
				// Remove the item from the local calendarItems array
				calendarItems = calendarItems.filter((ci) => ci.id !== item.id);
				setOverlappingIndex();
				refresh = false;
			})
			.catch((error) => {
				console.error('Error deleting item:', error);
				refresh = false;
			});
	}

	onMount(() => {
		// Initialize time updates and calendar refresh interval.
		updateCurrentHourAndMinute();
		const interval = setInterval(() => {
			updateCurrentTimeOffset();
			updateCurrentTime();
			updateCurrentHourAndMinute();
		}, 500); // Update every 0.5 seconds
		//update every 30 seconds the calendar items
		const calendarInterval = setInterval(() => {
			// updateCalendarItems(false);

			calendarItems = calendarItems.sort((a, b) => {
				const offsetA = a.offset || (0 / 80) * 3600000;
				const offsetB = b.offset || (0 / 80) * 3600000;
				return a.start.getTime() + offsetA - (b.start.getTime() + offsetB);
			});
		}, 500); // Update every 30 seconds TODO: Fix it so it doesnt reset the
		updateCalendarItems();
		const scrollArea = document.querySelector('#scrollArea');
		if (scrollArea) {
			scrollArea.scrollTop = currentTimeOffset;
		}

		// Listen to key events for scroll sensitivity adjustment.
		function handleKeyDown(e: KeyboardEvent) {
			if (e.ctrlKey) {
				offsetCourse = minutesToOffset(15); // TODO minutesToOffset doesn't work properly because of float precision
			}
		}
		function handleKeyUp(e: KeyboardEvent) {
			if (!e.ctrlKey) {
				offsetCourse = minutesToOffset(15);
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			clearInterval(interval);
		};
	});

	// React to selectedDate changes to refresh calendar items.
	$effect(() => {
		if (selectedDate) {
			calendarOpen = false;
			updateCalendarItems();
			setTimeout(() => {
				previousDate = selectedDate;
			}, 50);
		} else {
			selectedDate = fromDate(new Date(), timezone);
		}
	});

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	let lastScroll:
		| {
				x: number;
				y: number;
		  }
		| undefined = $state();

	let headerScrollArea: HTMLDivElement;
	if (browser) {
		const savedScroll = localStorage.getItem('calendarScroll');
		if (savedScroll) {
			const { x, y } = JSON.parse(savedScroll);
			lastScroll = { x, y };
		}
	}

	// Sync header scroll with content scroll.
	function syncScroll(e: Event) {
		const scrollLeft = (e.target as HTMLElement).scrollLeft;
		const scrollTop = (e.target as HTMLElement).scrollTop;
		headerScrollArea.style.transform = `translateX(-${scrollLeft}px)`;
		lastScroll = {
			x: scrollLeft,
			y: scrollTop
		};
		// Save scroll position to localStorage
		try {
			localStorage.setItem('calendarScroll', JSON.stringify({ x: scrollLeft, y: scrollTop }));
		} catch (err) {
			// Ignore localStorage errors
		}
	}

	// Converts minutes to offset for the calendar.
	function minutesToOffset(minutes: number) {
		return (minutes / 60) * hourHeight;
	}
	// Returns a random color name based on a seed string.
	function getRandomColorName(seed: string) {
		const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
		let hash = 0;
		for (let i = 0; i < seed.length; i++) {
			hash = seed.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % colors.length;
		return colors[index];
	}
	let calendarOpen = $state(false);
	let offsetCourse = $state(minutesToOffset(15));
</script>

<!-- UI Structure using Card and ScrollArea components -->
<Card.Root
	class={cn(
		'relative flex h-[calc(100vh-220px)] max-h-400 min-h-100 w-full flex-col overflow-hidden',
		className
	)}
	{...restProps}
>
	{#if refresh}
		<div class="bg-muted/30 absolute z-10 flex h-full w-full items-center justify-center">
			<LoaderCircle class="text-muted-foreground h-12 w-12 animate-spin" />
		</div>
	{/if}
	<div class="absolute inset-0">
		<Card.Header>
			<div
				bind:this={headerScrollArea}
				class="max-h- ml-auto grid w-[calc(100%-3.5rem)]"
				style={`grid-template-columns: repeat(${people.length}, 1fr);`}
			>
				{#each people as person, i}
					<div
						class="flex min-w-50 flex-col items-center justify-center gap-2"
						class:ml-5={i === 0}
					>
						<Avatar.Root class="h-16 w-16 rounded-md">
							<Avatar.Image
								src={person.avatar ? PUBLIC_CDN_URL + person.avatar : ''}
								alt="@shadcn"
							/>
							<Avatar.Fallback>
								<img src="/images/placeholder-small.svg" alt="" />
							</Avatar.Fallback>
						</Avatar.Root>
						<p class="p-0 text-center">
							{person.name}
						</p>
					</div>
				{/each}
			</div>
		</Card.Header>
		{#key selectedDate}
			<div
				class="h-full pb-24"
				in:fly={{
					x: previousDate && selectedDate && previousDate.compare(selectedDate) > 0 ? -250 : 250,
					duration:
						previousDate &&
						selectedDate &&
						df.format(previousDate.toDate(timezone)) !== df.format(selectedDate.toDate(timezone))
							? 300
							: 0
				}}
			>
				<ScrollArea
					class="relative h-full w-full"
					orientation="both"
					defaultScroll={lastScroll || { x: 0, y: currentTimeOffset - 160 }}
					id="scrollArea"
					onscroll={(e) => {
						syncScroll(e);
					}}
				>
					{#if !loading}
						<div class="p-6">
							<div class="sameGrid relative ml-14 grid h-[100%] grid-cols-1 grid-rows-1">
								<div class="mt-5">
									{#each formattedHours as hour}
										<div class="border-border relative border-t" style={`height: ${hourHeight}px;`}>
											<h1
												class="text-muted-foreground absolute w-12 -translate-x-[120%] -translate-y-1/2 transform text-center text-sm"
											>
												{#if !(hour.date.getTime() > new Date(1970, 0, 1, currentHour, currentMinute).getTime() - 15 * 60 * 1000 && hour.date.getTime() < new Date(1970, 0, 1, currentHour, currentMinute).getTime() + 16 * 60 * 1000) || !timeIndicator}
													{hour.formated}
												{/if}
											</h1>
										</div>
									{/each}
								</div>
								<div class="grid" style={`grid-template-columns: repeat(${people.length}, 1fr);`}>
									{#each people as person, i}
										{@const disabledItem = disabledItems.find((d) => d.person === person.name)}
										<div class="border-border relative min-w-50 border-l" class:ml-5={i === 0}>
											{#each parseIntervalToCorrectType(disabledItem?.date ?? [], disabledItem?.type ?? 'repeated-date') ?? [] as date}
												<div
													class="absolute top-0 left-0 mt-5 h-full w-full bg-gray-500/20"
													style={`top: ${date.start ? calculateOffset(date.start.toJSDate()) : 0}px; height: ${
														date.end && date.start
															? calculateOffset(date.end.toJSDate()) -
																calculateOffset(date.start.toJSDate())
															: 0
													}px;`}
												></div>
											{/each}
											{#each calendarItems as item, index}
												{#if person.name === item.person}
													{@const layeredOffset = item.overlappingIndex || 0}
													{@const itemEdited = edited[item.id || ''] ?? false}
													{#if itemEdited}
														<CalendarCard
															ondelete={() => deleteItem(item)}
															class={cn(
																`absolute right-0 mt-5 opacity-50`,
																layeredOffset > 0 ? 'outline-background outline' : ''
															)}
															offset={calculateOffset(item.start) + (item.offset || 0)}
															height={calculateOffset(item.end) - calculateOffset(item.start)}
															widthOffset={layeredOffset * 10}
															color={person.color || getRandomColorName(person.name)}
															index={layeredOffset}
															status={item.status}
															startDate={calculateDateTimeDate(item.start, item.offset || 0)}
															endDate={calculateDateTimeDate(item.end, item.offset || 0)}
															title={item.title}
															id={item.id}
															serviceId={item.serviceId}
															memberId={item.memberId}
															branchId={restProps.branchId}
															{...restProps}
														/>
													{/if}

													<div
														class={cn(itemEdited ? 'z-20' : '')}
														use:draggable={{
															threshold: {
																distance: 20
															},
															position: { x: item.x ?? 0, y: item.y ?? 0 },
															grid: [0, offsetCourse],
															onDragStart: (e) => {
																if (!item.id) return;
																edited[item.id] = true;
																onMoveItem(item, hourHeight);
															},
															onDrag: (e) => {
																item.x = e.offsetX;
																item.y = e.offsetY;
															},
															onDragEnd: (e) => {
																if (!item.id) return;
																edited[item.id] = false;
																item.offset = e.offsetY;
																updateItem(item);
																onMoveItemEnd(item, hourHeight);
															}
														}}
													>
														<CalendarCard
															oninfo={() => {}}
															onsave={async (editData) => {
																await updateCalendarItems(true);
															}}
															ondelete={() => deleteItem(item)}
															class={cn(
																`absolute right-0 mt-5`,
																layeredOffset > 0 ? 'outline-background outline' : '',
																item.edit ? 'z-10 shadow-[0_4px_12px_0_rgba(0,0,0,0.2)]' : ''
															)}
															offset={calculateOffset(item.start)}
															startDate={calculateDateTimeDate(item.start, item.y || 0)}
															endDate={calculateDateTimeDate(item.end, item.y || 0)}
															height={Math.min(calculateOffset(item.end), hourHeight * 24) -
																calculateOffset(item.start)}
															widthOffset={item.edit ? 0.1 : layeredOffset * 10}
															color={person.color || getRandomColorName(person.name)}
															title={item.title}
															index={layeredOffset}
															notes={item.notes}
															status={item.status}
															id={item.id}
															edit={itemEdited}
															serviceId={item.serviceId}
															memberId={item.memberId}
															branchId={restProps.branchId}
															{timezone}
															{...restProps}
														/>
													</div>
												{/if}
											{/each}
										</div>
									{/each}
								</div>
								{#if timeIndicator}
									<div
										class="border-destructive pointer-events-none absolute top-0 mt-5 h-min w-full border-t transition-transform duration-500"
										style={`transform: translateY(${currentTimeOffset}px);`}
									>
										<div
											class="text-destructive pointer-events-auto absolute w-12 -translate-x-[120%] -translate-y-1/2 transform text-center text-sm"
										>
											{currentTime}
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div
							class="flex h-full min-h-485 w-full items-center justify-center"
							style={`min-height: ${(1940 / 80) * hourHeight}px;`}
						>
							<div
								class="absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center"
							>
								<LoaderCircle class="text-muted-foreground h-12 w-12 animate-spin" />
							</div>
						</div>
					{/if}
				</ScrollArea>
			</div>
		{/key}
	</div>
</Card.Root>

<style>
	.sameGrid {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
	}
	.sameGrid > div {
		grid-row: 1;
		grid-column: 1;
	}
</style>
