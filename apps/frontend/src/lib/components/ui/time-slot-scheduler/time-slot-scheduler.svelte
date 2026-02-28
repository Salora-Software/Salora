<script lang="ts">
	import * as Select from '$lib/components/ui/select/index';
	import { Button } from '$lib/components/ui/button/index';
	import { Separator } from '$lib/components/ui/separator/index';
	import * as Card from '$lib/components/ui/card/index';
	import { Minus, Plus } from 'lucide-svelte';
	import { t } from '$lib/translation';
	type TimeSlot = {
		id?: string;
		day: number;
		openHour: string;
		openMinute: string;
		closeHour: string;
		closeMinute: string;
	};
	let {
		class: className,
		schedules = $bindable([]),
		ondelete = $bindable(async () => {}),
		...restProps
	}: {
		schedules: TimeSlot[];
		ondelete?: (schedule: TimeSlot) => void | Promise<void>;
		[key: string]: any;
	} = $props();
	let sortedSchedules = $state(
		schedules.sort((a, b) => {
			if (a.day !== b.day) {
				return a.day - b.day;
			}
			const aOpenTime = `${a.openHour}:${a.openMinute}`;
			const bOpenTime = `${b.openHour}:${b.openMinute}`;
			return aOpenTime.localeCompare(bOpenTime);
		})
	);
	$effect(() => {
		sortedSchedules = schedules.sort((a, b) => a.day - b.day);
	});

	function addSlot(schedule: TimeSlot, index: number) {
		let slotDay = schedules[index].day;
		schedules = [
			...schedules.slice(0, index + 1),
			{ day: slotDay, openHour: '', openMinute: '', closeHour: '', closeMinute: '' },
			...schedules.slice(index + 1)
		];
	}

	function removeSlot(schedule: TimeSlot, index: number) {
		ondelete(schedule);
	}
</script>

<div class="grid grid-cols-6 items-center gap-4 font-semibold">
	<span>Weekdag</span>
	<span>Openingstijd</span>
	<span></span>
	<span>Sluitingstijd</span>
	<span></span>
	<span>Acties</span>
</div>

{#each sortedSchedules as schedule, index}
	<div class="grid grid-cols-6 items-center gap-4 border-b py-2">
		<Select.Root type="single" bind:value={schedule.day as unknown as string}>
			<Select.Trigger class="w-full rounded border px-2 py-1"
				>{t.days[schedule.day as keyof typeof t.days]}
			</Select.Trigger>
			<Select.Content>
				{#each Object.values(t.days).filter((day) => typeof day === 'string') as day}
					<Select.Item value={t.days[day as keyof typeof t.days] as string}>{day}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<div class="flex items-center gap-4">
			<Select.Root type="single" bind:value={schedule.openHour}>
				<Select.Trigger class="w-full rounded border px-2 py-1">{schedule.openHour}</Select.Trigger>
				<Select.Content>
					{#each Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')) as h}
						<Select.Item value={h}>{h}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			:
		</div>
		<Select.Root type="single" bind:value={schedule.openMinute}>
			<Select.Trigger class="w-full rounded border px-2 py-1">{schedule.openMinute}</Select.Trigger>
			<Select.Content>
				{#each ['00', '15', '30', '45'] as m}
					<Select.Item value={m}>{m}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<div class="flex items-center gap-4">
			<Select.Root type="single" bind:value={schedule.closeHour}>
				<Select.Trigger class="w-full rounded border px-2 py-1">{schedule.closeHour}</Select.Trigger
				>
				<Select.Content>
					{#each Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')) as h}
						<Select.Item value={h}>{h}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			:
		</div>

		<Select.Root type="single" bind:value={schedule.closeMinute}>
			<Select.Trigger class="w-full rounded border px-2 py-1">{schedule.closeMinute}</Select.Trigger
			>
			<Select.Content>
				{#each ['00', '15', '30', '45'] as m}
					<Select.Item value={m}>{m}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<div class="flex space-x-2">
			<Button class="h-8 w-8  px-2 py-1 text-sm" onclick={() => addSlot(schedule, index)}>
				<Plus />
			</Button>
			{#if index !== 0}
				<Button
					class="h-8 w-8 px-2 py-1 text-sm"
					onclick={() => {
						///remove this current slot
						schedules = schedules.filter((scheduleLoop, indexLoop) => scheduleLoop !== schedule);
						removeSlot(schedule, index);
					}}
				>
					<Minus />
				</Button>
			{/if}
		</div>
	</div>
{/each}
