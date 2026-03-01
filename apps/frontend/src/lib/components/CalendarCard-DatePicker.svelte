<script lang="ts">
	import { DateFormatter, type DateValue, getLocalTimeZone } from '@internationalized/date';
	import { cn } from '$lib/utils.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { DateTime } from 'luxon';
	import { getLocale } from '$lib/translation';
	import { untrack } from 'svelte';
	let {
		startDate = $bindable(undefined),
		endDate = $bindable(undefined),
		timezone = $bindable('UTC')
	}: {
		startDate?: DateTime;
		endDate?: DateTime;
		timezone?: string;
	} = $props();

	const locale = getLocale();

	let value = $state<DateValue | undefined>();
	let open = $state(false);
	let contentRef = $state<HTMLElement | null>(null);

	// Added error state variables
	let isStartTimeError = $state(false);
	let isEndTimeError = $state(false);

	// New helper function to validate time range
	function validateRange() {
		if (startDate && endDate) {
			if (startDate.toMillis() > endDate.toMillis()) {
				isStartTimeError = true;
				isEndTimeError = true;
			} else {
				isStartTimeError = false;
				isEndTimeError = false;
			}
		}
	}

	$effect(() => {
		if (value) {
			untrack(() => {
				open = false;
				// update startDate and endDate their year, month, and day keep the time
				if (startDate) {
					startDate = startDate.set({
						year: value?.year,
						month: value?.month,
						day: value?.day
					});
				} else {
					startDate = DateTime.now().setZone(timezone).set({
						year: value?.year,
						month: value?.month,
						day: value?.day
					});
				}
				if (endDate) {
					endDate = endDate.set({
						year: value?.year,
						month: value?.month,
						day: value?.day
					});
				} else {
					endDate = DateTime.now().setZone(timezone).set({
						year: value?.year,
						month: value?.month,
						day: value?.day
					});
				}
				return;
			});
		}
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={cn(
			buttonVariants({
				variant: 'outline',
				class: 'h-10 w-full justify-start text-left font-normal',
				size: 'sm'
			}),
			!startDate && 'text-muted-foreground'
		)}
	>
		{startDate ? startDate.setZone(timezone).toLocaleString(DateTime.DATE_MED) : ''}
	</Popover.Trigger>
	<Popover.Content bind:ref={contentRef} class="w-auto p-0">
		<Calendar locale={locale} type="single" bind:value />
	</Popover.Content>
</Popover.Root>
<div class="mt-2 grid h-10 grid-cols-[1fr_auto_1fr] place-items-center gap-2">
	<input
		class={cn(
			buttonVariants({
				variant: 'outline',
				class: 'h-10 w-full justify-start text-left font-normal',
				size: 'sm'
			}),
			!startDate && 'text-muted-foreground',
			isStartTimeError && 'bg-red-200 hover:bg-red-300'
		)}
		onclick={(e) => {
			// select the whole text
			e.currentTarget.select();
		}}
		title={startDate ? startDate.setZone(timezone).toFormat('HH:mm') : 'Select Time'}
		value={startDate ? startDate.setZone(timezone).toFormat('HH:mm') : 'Select Time'}
		placeholder="Select Time"
		onchange={(e) => {
			const inputValue = e.currentTarget.value;
			if (inputValue) {
				const parts = inputValue.split(':');
				if (parts.length !== 2) {
					isStartTimeError = true;
					return;
				}
				const [hours, minutes] = parts.map(Number);
				if (
					isNaN(hours) ||
					isNaN(minutes) ||
					hours < 0 ||
					hours > 23 ||
					minutes < 0 ||
					minutes > 59
				) {
					isStartTimeError = true;
					return;
				} else {
					isStartTimeError = false;
				}
				validateRange();
				if (startDate) {
					startDate = startDate.set({ hour: hours, minute: minutes });
				} else {
					startDate = DateTime.now().setZone(timezone).set({ hour: hours, minute: minutes });
				}
			}
		}}
	/>
	–
	<input
		class={cn(
			buttonVariants({
				variant: 'outline',
				class: 'h-10 w-full justify-start text-left font-normal',
				size: 'sm'
			}),
			!endDate && 'text-muted-foreground',
			isEndTimeError && 'bg-red-200 hover:bg-red-300'
		)}
		onclick={(e) => {
			// select the whole text
			e.currentTarget.select();
		}}
		title={endDate ? endDate.setZone(timezone).toFormat('HH:mm') : 'Select Time'}
		value={endDate ? endDate.setZone(timezone).toFormat('HH:mm') : 'Select Time'}
		placeholder="Select Time"
		onchange={(e) => {
			const inputValue = e.currentTarget.value;
			if (inputValue) {
				const parts = inputValue.split(':');
				if (parts.length !== 2) {
					isEndTimeError = true;
					return;
				}
				const [hours, minutes] = parts.map(Number);
				if (
					isNaN(hours) ||
					isNaN(minutes) ||
					hours < 0 ||
					hours > 23 ||
					minutes < 0 ||
					minutes > 59
				) {
					isEndTimeError = true;
					return;
				} else {
					isEndTimeError = false;
				}
				if (endDate) {
					endDate = endDate.set({ hour: hours, minute: minutes });
				} else {
					endDate = DateTime.now().setZone(timezone).set({ hour: hours, minute: minutes });
					validateRange();
				}
			}
		}}
	/>
</div>
