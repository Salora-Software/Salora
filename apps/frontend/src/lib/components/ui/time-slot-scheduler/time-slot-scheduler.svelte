<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import * as Select from '$lib/components/ui/select/index';
	import { Button } from '$lib/components/ui/button/index';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { t } from '$lib/translation';

	export type TimeSlot = {
		id?: string;
		day: number;
		openTime: string;
		closeTime: string;
	};

	let {
		class: className = '',
		schedules = $bindable([]),
		ondelete = async () => {},
		...restProps
	}: {
		class?: string;
		schedules: TimeSlot[];
		ondelete?: (schedule: TimeSlot) => void | Promise<void>;
		[key: string]: any;
	} = $props();

	let sortedSchedules = $derived(
		[...schedules].sort((a, b) => {
			if (a.day !== b.day) return a.day - b.day;
			return a.openTime.localeCompare(b.openTime);
		})
	);

	function addSlot(index: number) {
		const targetDay = schedules[index]?.day ?? 0;
		schedules = [
			...schedules.slice(0, index + 1),
			{ day: targetDay, openTime: '09:00', closeTime: '17:00' },
			...schedules.slice(index + 1)
		];
	}

	function removeSlot(schedule: TimeSlot) {
		schedules = schedules.filter((s) => s !== schedule);
		ondelete(schedule);
	}
</script>

<div class="w-full max-w-3xl {className}" {...restProps}>
	<div
		class="grid grid-cols-12 gap-4 border-b border-neutral-200 pb-2 text-sm font-medium text-neutral-500"
	>
		<div class="col-span-4 pl-2">Weekdag</div>
		<div class="col-span-6">Tijden</div>
		<div class="col-span-2 pr-2 text-right">Acties</div>
	</div>

	<div class="divide-y divide-neutral-100">
		{#each sortedSchedules as schedule, index (schedule.id ?? index)}
			<div
				class="grid grid-cols-12 items-center gap-4 py-2 transition-colors hover:bg-neutral-50/50"
			>
				<!-- DAG SELECTOR -->
				<div class="col-span-4">
					<Select.Root type="single" bind:value={schedule.day as unknown as string}>
						<Select.Trigger class="h-10 w-full border-neutral-200 bg-white">
							{t.days[schedule.day as keyof typeof t.days] ?? 'Kies dag'}
						</Select.Trigger>
						<Select.Content>
							{#each Object.entries(t.days) as [dayKey, dayLabel]}
								<Select.Item value={dayKey}>{dayLabel}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- COMPACTE TIJDEN GROEP -->
				<div class="col-span-6">
					<div
						class="focus-within:border-primary focus-within:ring-primary flex h-10 w-fit items-center rounded-lg border border-neutral-200 bg-white px-1 shadow-sm transition-shadow focus-within:ring-1"
					>
						<Input
							type="time"
							bind:value={schedule.openTime}
							class="h-8 border-0 bg-transparent px-2 font-medium shadow-none focus-visible:ring-0"
						/>
						<!-- Subtiele scheidingslijn -->
						<div class="mx-1 h-4 w-px bg-neutral-200"></div>
						<Input
							type="time"
							bind:value={schedule.closeTime}
							class="h-8 border-0 bg-transparent px-2 font-medium shadow-none focus-visible:ring-0"
						/>
					</div>
				</div>

				<!-- ACTIES -->
				<div class="col-span-2 flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon"
						class="h-9 w-9 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
						onclick={() => addSlot(index)}
					>
						<Plus class="h-4 w-4" />
					</Button>

					{#if schedules.length > 1}
						<Button
							variant="ghost"
							size="icon"
							class="h-9 w-9 text-neutral-400 hover:bg-red-50 hover:text-red-600"
							onclick={() => removeSlot(schedule)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
