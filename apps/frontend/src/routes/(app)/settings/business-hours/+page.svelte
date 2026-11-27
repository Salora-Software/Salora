<script lang="ts">
	import CircleUser from '@solar-icons/svelte/linear/user-circle';
	import Menu from '@solar-icons/svelte/linear/hamburger-menu';
	import Package2 from '@solar-icons/svelte/linear/box-minimalistic';
	import Search from '@solar-icons/svelte/linear/magnifier';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { t } from '$lib/translation.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import * as Select from '$lib/components/ui/select/index';
	import TimeSlotScheduler, {
		type TimeSlot
	} from '$lib/components/ui/time-slot-scheduler/time-slot-scheduler.svelte';
	import Loader from '@solar-icons/svelte/linear/loader';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { orpc } from '$lib/orpc.js';
	import { toBusinessHours } from '$lib/utils';
	let { data } = $props();
	const defaultBusinessLayout: TimeSlot[] = [1, 2, 3, 4, 5].map((day) => ({
		day,
		openTime: '',
		closeTime: ''
	}));
	let businessHours = $state<TimeSlot[]>(defaultBusinessLayout.map((slot) => ({ ...slot })));
	let loading = $state(false);
	let pendingDeletion: string[] = $state([]);
	async function updateOpeningTimes() {
		pendingDeletion = [];
		if (!activeBranch) return;
		await data.branchesState.updateOpeningTimes();
		if (activeBranch.openingTimes.length == 0) {
			businessHours = defaultBusinessLayout.map((slot) => ({ ...slot }));
			return;
		}
		businessHours = toBusinessHours(activeBranch.openingTimes, activeBranch.timeZone);
		if (businessHours.length == 0) {
			businessHours = defaultBusinessLayout.map((slot) => ({ ...slot }));
		}
	}
	onMount(async () => {
		activeBranch = data.branchesState.getActiveBranch();
		if (activeBranch)
			businessHours = toBusinessHours(activeBranch.openingTimes, activeBranch.timeZone);
		updateOpeningTimes();
	});

	let activeBranch = $state(data.branchesState.getActiveBranch());
	data.branchesState.onBranchChange(() => {
		activeBranch = data.branchesState.getActiveBranch();
		if (activeBranch)
			businessHours = toBusinessHours(activeBranch.openingTimes, activeBranch.timeZone);
		updateOpeningTimes();
	});
</script>

<h2 class="text-2xl font-semibold">
	{t.pages['business-hours']}
</h2>
<p class="text-muted-foreground max-w-150 text-sm">
	Stel hier de openingstijden van uw bedrijf in. (De tijdzone is ingesteld op {activeBranch?.timeZone}
	als je dit wilt wijzigen, klik dan
	<a href="/settings/general?selection=tijdzone" class="text-blue-500 underline">hier</a>)
</p>
<Separator class="my-4" />
<TimeSlotScheduler
	bind:schedules={businessHours}
	ondelete={(schedule) => {
		if (schedule.id) pendingDeletion = [...pendingDeletion, schedule.id];
	}}
/>
<Button
	class="mt-4 h-9 w-25"
	onclick={async () => {
		loading = true;
		try {
			if (!activeBranch) throw new Error('No active branch');
			const filledSlots = businessHours.filter((slot) => slot.openTime && slot.closeTime);
			const updatedTimes = await orpc.v1.schedule.updateOpeningTimes({
				organizationId: activeBranch.id,
				removeItems: pendingDeletion,
				openingTimes: filledSlots.map((slot) => ({
					id: slot.id,
					dayOfWeek: Number(slot.day),
					startTimeLocal: slot.openTime.padStart(5, '0'),
					endTimeLocal: slot.closeTime.padStart(5, '0')
				}))
			});
			activeBranch.openingTimes = updatedTimes;
			data.branchesState.updateActiveBranch(activeBranch);
			pendingDeletion = [];
			toast.success(`Succesvol bijgewerkt`);
		} catch (error) {
			toast.error('Opslaan van de openingstijden is mislukt');
		} finally {
			loading = false;
		}
	}}
	disabled={loading}
>
	{#if loading}
		<Loader class="animate-spin" />
	{:else}
		Opslaan
	{/if}
</Button>
