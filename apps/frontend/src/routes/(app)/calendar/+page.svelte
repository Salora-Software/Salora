<script lang="ts">
	import EventCalandar from '$lib/components/EventCalandar.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { Calendar } from '$lib/components/ui/calendar';
	import { CalendarIcon } from 'lucide-svelte';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import { trpcQuery } from '$lib/trpc.js';
	import { language, t } from '$lib/translation.js';
	import { DateTime, Interval } from 'luxon';
	import type { BranchType } from '$lib/runes.svelte.js';
	let { data } = $props();
	let activeBranch: BranchType | null = $state(data.branchesState.getActiveBranch());
	const queryClient = data.queryClient;

	// Calendar queries and mutations using trpcQuery (TanStack Query)

	let selectedDate = $state<DateValue | undefined>(today(getLocalTimeZone()));

	// Local state for calendar to avoid binding issues
	let calendarDate = $state<DateValue | undefined>(undefined);

	// Sync calendar date with selected date
	$effect(() => {
		if (calendarDate) {
			selectedDate = calendarDate;
		}
	});

	let cancelRefetching = $state(false);
	// Calendar query (must be after selectedDate declaration)
	let calendarQuery = $derived(
		trpcQuery.v1.authenticated.calendar.getCalendar.createQuery(
			{
				organizationId: activeBranch?.id || '',
				startDate: selectedDate
					? DateTime.fromJSDate(selectedDate.toDate(activeBranch?.timeZone || 'UTC'))
							.setZone(activeBranch?.timeZone || 'UTC')
							.startOf('day')
							.toJSDate()
					: undefined,
				endDate: selectedDate
					? DateTime.fromJSDate(selectedDate.toDate(activeBranch?.timeZone || 'UTC'))
							.setZone(activeBranch?.timeZone || 'UTC')
							.endOf('day')
							.toJSDate()
					: undefined
			},
			{
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
				enabled: !!activeBranch && !!selectedDate,
				refetchInterval: cancelRefetching ? false : 5000 // Disable refetching if cancelRefetching is true
			}
		)
	);

	// Calendar mutations
	const updateCalendarItem = trpcQuery.v1.authenticated.calendar.updateCalendarItem.createMutation({
		mutationKey: ['updateCalendarItem'],
		onMutate: ({ id, startTime, endTime }) => {
			queryClient.cancelQueries({
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || '']
			});
			//get previous data
			const previousData = queryClient.getQueryData([
				'getCalendar',
				activeBranch?.id || '',
				selectedDate?.toString() || ''
			]);
			// update the item
			queryClient.setQueryData(
				['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
				(oldData: any) => {
					if (!oldData) return oldData;

					return {
						...oldData,
						items: oldData.items.map((item: any) =>
							item.id === id
								? {
										...item,
										startTime: startTime,
										endTime: endTime
									}
								: item
						)
					};
				}
			);
			return { previousData };
		},
		onError: (err, { id }, context: any) => {
			queryClient.setQueryData(
				['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
				context?.previousData
			);
			console.error('Error updating calendar item:', err);
		},

		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || '']
			});
		}
	});

	const deleteCalendarItem = trpcQuery.v1.authenticated.calendar.deleteCalendarItem.createMutation({
		mutationKey: ['deleteCalendarItem'],
		onMutate: ({ id }) => {
			queryClient.cancelQueries({
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || '']
			});
			//get previous data
			const previousData = queryClient.getQueryData([
				'getCalendar',
				activeBranch?.id || '',
				selectedDate?.toString() || ''
			]);
			// delete the item
			queryClient.setQueryData(
				['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
				(oldData: any) => {
					if (!oldData) return oldData;

					return {
						...oldData,
						items: oldData.items.filter((item: any) => {
							return item.id !== id;
						})
					};
				}
			);
			return { previousData };
		},
		onError: (err, id, context: any) => {
			queryClient.setQueryData(
				['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
				context?.previousData
			);
			console.error('Error deleting calendar item:', err);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || '']
			});
		}
	});
	const upsertCalendarItem = trpcQuery.v1.authenticated.calendar.upsertCalendarItem.createMutation({
		mutationKey: ['upsertCalendarItem'],
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getCalendar', activeBranch?.id || '', selectedDate?.toString() || '']
			});
		}
	});

	type Person = { name: string; avatar?: string };
	let people = $state<Person[]>([]);

	type DisabledItem = {
		person: string;
		date: Interval[];
		time: Interval[];
		type: 'date' | 'repeated-date';
	};
	let disabledItems = $state<DisabledItem[]>([]);
	// removed duplicate declaration of disabledItems

	// Sync calendar date with selected date
	$effect(() => {
		if (calendarDate) {
			selectedDate = calendarDate;
		}
	});

	let calendarOpen = $state(false);
	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	// Derived sorted members
	const roleOrder: Record<'owner' | 'admin' | 'employee', number> = {
		owner: 0,
		admin: 1,
		employee: 2
	};

	$effect(() => {
		if (activeBranch?.members) {
			sortedMembers = activeBranch.members.slice().sort((a, b) => {
				const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
				const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
				if (roleA !== roleB) return roleA - roleB;
				const dateA = new Date(a.user.createdAt).getTime();
				const dateB = new Date(b.user.createdAt).getTime();
				return dateA - dateB;
			});
		} else {
			sortedMembers = [];
		}
	});

	// Define MemberType for correct typing
	type MemberType = {
		role: string;
		user: {
			name: string;
			createdAt: string | Date;
			updatedAt: string | Date;
			email: string;
			id: string;
			emailVerified: boolean;
			image: string | null;
			phone: string | null;
		};
		id: string;
		services: string[];
		availability: any[];
	};

	let sortedMembers = $state<MemberType[]>([]);
	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	$effect(() => {
		people = sortedMembers.map((member: MemberType) => ({
			name: member.user.name,
			avatar: member.user.image || undefined
		}));
	});
</script>

<h1 class="mt-5 mb-6 text-3xl font-semibold">{t.pages.calendar}</h1>

<div
	class="mb-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
>
	<!-- Date at bottom on mobile, right on desktop -->
	<div class="flex w-full justify-center sm:w-auto sm:justify-start">
		<Popover.Root bind:open={calendarOpen}>
			<Popover.Trigger
				class={cn(
					buttonVariants({
						variant: 'outline',
						class: 'w-content w-full max-w-full justify-start text-left font-normal sm:min-w-53.75'
					})
				)}
			>
				<CalendarIcon />
				{selectedDate
					? DateTime.fromJSDate(selectedDate.toDate(activeBranch?.timeZone || 'UTC'))
							.setLocale(language)
							.toFormat('cccc, dd MMMM, yyyy')
					: ''}
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0" align="end" side="bottom">
				<Calendar locale={language} type="single" bind:value={calendarDate} />
			</Popover.Content>
		</Popover.Root>
	</div>
	<!-- Controls row: today + arrows -->
	<div class="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
		<Button
			variant="outline"
			class="flex-1 sm:flex-none"
			disabled={selectedDate &&
				selectedDate.toDate(getLocalTimeZone()).toDateString() === new Date().toDateString()}
			onclick={() => {
				selectedDate = today(getLocalTimeZone());
			}}>{t.dateRange.today}</Button
		>
		<div class="flex gap-2">
			<Button
				variant="outline"
				class="h-8 w-8 rounded-full"
				onclick={() => {
					if (selectedDate) {
						selectedDate = selectedDate.add({ days: -1 });
					}
				}}
			>
				<ChevronLeft />
			</Button>
			<Button
				variant="outline"
				class="h-8 w-8 rounded-full"
				onclick={() => {
					if (selectedDate) {
						selectedDate = selectedDate.add({ days: 1 });
					}
				}}
			>
				<ChevronRight />
			</Button>
		</div>
	</div>
</div>
<div class="overflow-hidden">
	{#key activeBranch}
		<EventCalandar
			bind:selectedDate
			bind:people
			services={activeBranch?.services || []}
			members={activeBranch?.members || []}
			branchId={activeBranch?.id}
			loading={calendarQuery.isLoading}
			timezone={activeBranch?.timeZone}
			getCalendarItems={async (date) => {
				// Use calendarQuery for data
				const response = calendarQuery.data || [];
				let items = Array.isArray(response) ? response : (response?.items ?? []);
				disabledItems =
					!Array.isArray(response) && response?.disabledItems
						? response.disabledItems.map((item: any) => ({
								person: item.person || '',
								date: item.date || [],
								time: Array.isArray(item.time) ? item.time : [],
								type:
									typeof item.type === 'string' &&
									(item.type === 'date' || item.type === 'repeated-date')
										? item.type
										: 'date'
							}))
						: [];
				const endResponse = items.map((item) => {
					const start = item.startTime;
					const end = item.endTime;

					return {
						person: item.member?.user.name || '',
						title: item.title || undefined,
						status: item.booking?.status as
							| 'PENDING'
							| 'CONFIRMED'
							| 'CANCELLED'
							| 'COMPLETED'
							| undefined,
						notes: item.notes || undefined,
						serviceId: item.booking?.serviceId || undefined,
						memberId: item.member?.id || undefined,
						start: start,
						end: end,
						id: item.id
					};
				});
				return endResponse;
			}}
			{disabledItems}
			onItemChange={async (item, hourHeight) => {
				if (!item || !item.start || !item.end) return;
				await updateCalendarItem.mutateAsync({
					startTime: new Date(item.start.getTime() + ((item.offset || 0) / hourHeight) * 3600000),
					endTime: new Date(item.end.getTime() + ((item.offset || 0) / hourHeight) * 3600000),
					id: item.id || ''
				});
			}}
			onItemDelete={async (item) => {
				if (!item || !item.id) return;
				await deleteCalendarItem.mutateAsync({
					id: item.id
				});
			}}
			onUpsertItem={async (item) => {
				if (!item || !item.start || !item.end) return;
				const hourHeight = (item as any).hourHeight ?? 1; // fallback to 1 if not present
				upsertCalendarItem.mutate({
					type: 'BOOKING',
					id: item.id || '',
					startTime: new Date(item.start.getTime() + ((item.offset || 0) / hourHeight) * 3600000),
					endTime: new Date(item.end.getTime() + ((item.offset || 0) / hourHeight) * 3600000),
					title: item.title ?? '',
					notes: item.notes ?? '',
					memberId: item.person ?? '',
					status: item.status ?? '',
					organizationId: activeBranch?.id || ''
				});
			}}
			onMoveItem={async () => {
				cancelRefetching = true; // Disable refetching while moving
			}}
			onMoveItemEnd={async (item, hourHeight) => {
				cancelRefetching = false; // Re-enable refetching after moving
				// update the calendar query to fix the new data
				queryClient.setQueryData(
					['getCalendar', activeBranch?.id || '', selectedDate?.toString() || ''],
					(oldData: any) => {
						if (!oldData) return oldData;
						return {
							...oldData,
							items: oldData.items.map((i: any) =>
								i.id === item?.id
									? {
											...i,
											startTime: new Date(
												(item?.start ? item.start.getTime() : 0) +
													((item?.offset ?? 0) / (hourHeight ?? 1)) * 3600000
											),
											endTime: new Date(
												item && item.end
													? item.end.getTime() + ((item.offset || 0) / (hourHeight ?? 1)) * 3600000
													: 0
											)
										}
									: i
							)
						};
					}
				);
			}}
		/>
	{/key}
</div>
