<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import * as Calendar from './index.js';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { Skeleton } from '../skeleton';
	import type { ButtonVariant } from '../button/button.svelte';
	import { isEqualMonth, type DateValue } from '@internationalized/date';
	import { onMount, tick, type Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	let prevPlaceholder: DateValue | undefined = $state();

	let {
		ref = $bindable(null),
		value = $bindable(),
		placeholder = $bindable(),
		notAvailable = $bindable(false),
		class: className,
		weekdayFormat = 'short',
		buttonVariant = 'ghost',
		captionLayout = 'label',
		locale = 'en-US',
		months: monthsProp,
		years,
		monthFormat: monthFormatProp,
		yearFormat = 'numeric',
		day,
		loading = $bindable(false),
		disableDaysOutsideMonth = false,
		onPlaceholderChange = $bindable(() => {}),
		getPercentageBooked = () => 0,
		...restProps
	}: WithoutChildrenOrChild<CalendarPrimitive.RootProps> & {
		buttonVariant?: ButtonVariant;
		captionLayout?: 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label';
		months?: CalendarPrimitive.MonthSelectProps['months'];
		years?: CalendarPrimitive.YearSelectProps['years'];
		monthFormat?: CalendarPrimitive.MonthSelectProps['monthFormat'];
		yearFormat?: CalendarPrimitive.YearSelectProps['yearFormat'];
		loading?: boolean;
		day?: Snippet<[{ day: DateValue; outsideMonth: boolean }]>;
		getPercentageBooked?: (date: DateValue) => number;
		notAvailable: boolean;
	} = $props();

	const monthFormat = $derived.by(() => {
		if (monthFormatProp) return monthFormatProp;
		if (captionLayout.startsWith('dropdown')) return 'short';
		return 'long';
	});
	let loaded = $state(false);

	onMount(() => {
		loaded = true;
	});
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->

<CalendarPrimitive.Root
	bind:value={value as never}
	bind:ref
	bind:placeholder
	onPlaceholderChange={async (newPlaceholder) => {
		//only send this when newPlaceholder is different from prevPlaceholder in terms of month and year
		if (
			prevPlaceholder?.toString().split('-').splice(0, 2).join() !==
			newPlaceholder?.toString().split('-').splice(0, 2).join()
		) {
			onPlaceholderChange(newPlaceholder);
		}

		await tick();
		prevPlaceholder = newPlaceholder;
	}}
	{weekdayFormat}
	{disableDaysOutsideMonth}
	class={cn(
		'bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
		className
	)}
	{locale}
	{monthFormat}
	{yearFormat}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<Calendar.Months>
			{#key placeholder?.toString().split('-').splice(0, 2).join()}
				<div
					class="w-full"
					in:fly={{
						x: (prevPlaceholder || 0) < (placeholder || 0) ? 50 : -50,
						duration: loaded ? 100 : 0
					}}
				>
					{#each months as month, monthIndex (month)}
						<Calendar.Month>
							<Calendar.Header class="gap-2">
								<Calendar.Caption
									{captionLayout}
									months={monthsProp}
									{monthFormat}
									{years}
									{yearFormat}
									month={month.value}
									bind:placeholder
									{locale}
									{monthIndex}
								/>
								<Calendar.PrevButton
									variant={buttonVariant}
									class="border-widget-input-border bg-widget-input-bg text-widget-content-text hover:bg-widget-input-hover flex !h-[36px] w-[36px] items-center justify-center border !p-0"
								/>
								<Calendar.NextButton
									variant={buttonVariant}
									class="border-widget-input-border bg-widget-input-bg text-widget-content-text hover:bg-widget-input-hover flex !h-[36px] w-[36px] items-center justify-center border !p-0"
								/>
							</Calendar.Header>
							{#if !loading && notAvailable}
								<p class="text-widget-content-text mt-4 text-center">
									<span class="text-widget-content-text">
										Er is geen beschikbaarheid voor deze maand.
									</span>
								</p>
							{:else}
								<Calendar.Grid>
									<Calendar.GridHead>
										<Calendar.GridRow class="flex select-none justify-evenly gap-2">
											{#each weekdays as weekday (weekday)}
												<Calendar.HeadCell class="text-foreground w-full">
													{weekday.slice(0, 2)}
												</Calendar.HeadCell>
											{/each}
										</Calendar.GridRow>
									</Calendar.GridHead>
									<Calendar.GridBody>
										{#if loading}
											{#each month.weeks as weekDates}
												<Calendar.GridRow class="mt-2 w-full justify-evenly gap-2">
													{#each weekDates as _}
														<Skeleton class="bg-widget-calendar-bg h-[36px] w-full" />
													{/each}
												</Calendar.GridRow>
											{/each}
										{:else}
											{#each month.weeks as weekDates (weekDates)}
												<Calendar.GridRow class="mt-2 w-full justify-evenly gap-2">
													{#each weekDates as date (date)}
														<Calendar.Cell class="relative w-full" {date} month={month.value}>
															{#if day}
																{@render day({
																	day: date,
																	outsideMonth: !isEqualMonth(date, month.value)
																})}
															{:else}
																<div
																	class="dayCalendar border-widget-input-border text-widget-content-text bg-widget-calendar-bg hover:bg-widget-calendar-available group relative w-full overflow-hidden rounded-md border"
																>
																	<div
																		class="bg-widget-content-bg absolute left-0 right-0 top-0 group-[&:has(>div[aria-disabled='true'])]:hidden"
																		style="height: {getPercentageBooked(date)}%;"
																	></div>

																	<Calendar.Day
																		class="  
	  [&[data-disabled]]:bg-widget-calendar-bg/10
	  [&[data-disabled]:hover]:!bg-widget-calendar-bg/10
	  [&[data-selected]]:bg-widget-accent
	  relative w-full
	  [&[data-selected]]:text-white
	"
																	/>
																</div>
															{/if}
														</Calendar.Cell>
													{/each}
												</Calendar.GridRow>
											{/each}
										{/if}
									</Calendar.GridBody>
								</Calendar.Grid>
							{/if}
						</Calendar.Month>
					{/each}
				</div>
			{/key}
		</Calendar.Months>
	{/snippet}
</CalendarPrimitive.Root>

<style>
	:global(.dayCalendar:has(> div[aria-disabled='true'])) {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
