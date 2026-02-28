<script lang="ts">
	import CircleUser from 'lucide-svelte/icons/circle-user';
	import Menu from 'lucide-svelte/icons/menu';
	import Package2 from 'lucide-svelte/icons/package-2';
	import Search from 'lucide-svelte/icons/search';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { t } from '$lib/translation.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import * as Select from '$lib/components/ui/select/index';
	import TimeSlotScheduler from '$lib/components/ui/time-slot-scheduler/time-slot-scheduler.svelte';
	import { Loader } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { trpc } from '$lib/trpc.js';
	let { data } = $props();
	const defaultBusinessLayout = [
		{
			day: 1,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 2,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 3,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 4,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 5,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		}
	];
	let businessHours:
		| {
				id?: string;
				day: number;
				openHour: string;
				openMinute: string;
				closeHour: string;
				closeMinute: string;
		  }[]
		| [] = $state([...defaultBusinessLayout]);
	let loading = $state(false);
	let pendingDeletion: string[] = $state([]);
	async function updateOpeningTimes() {
		pendingDeletion = [];
		if (!activeBranch) return;
		await data.branchesState.updateOpeningTimes();
		if (activeBranch.openingTimes.length == 0) {
			businessHours = [...defaultBusinessLayout];
			return;
		}
		businessHours = activeBranch.openingTimes.map((slot) => {
			const [openHour, openMinute] = slot.startTimeLocal.split(':');
			const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
			return {
				id: slot.id,
				day: slot.dayOfWeek,
				openHour,
				openMinute,
				closeHour,
				closeMinute
			};
		});
	}
	onMount(async () => {
		activeBranch = data.branchesState.getActiveBranch();
		if (activeBranch)
			businessHours = activeBranch.openingTimes.map((slot) => {
				const [openHour, openMinute] = slot.startTimeLocal.split(':');
				const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
				return {
					id: slot.id,
					day: slot.dayOfWeek,
					openHour,
					openMinute,
					closeHour,
					closeMinute
				};
			});
		updateOpeningTimes();
	});

	let activeBranch = $state(data.branchesState.getActiveBranch());
	updateOpeningTimes();
	data.branchesState.onBranchChange(() => {
		activeBranch = data.branchesState.getActiveBranch();
		if (activeBranch)
			businessHours = activeBranch.openingTimes.map((slot) => {
				const [openHour, openMinute] = slot.startTimeLocal.split(':');
				const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
				return {
					id: slot.id,
					day: slot.dayOfWeek,
					openHour,
					openMinute,
					closeHour,
					closeMinute
				};
			});
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
			const updatedTimes = await trpc.v1.authenticated.schedule.updateOpeningTimes.mutate({
				organizationId: activeBranch.id,
				removeItems: pendingDeletion,
				openingTimes: businessHours.map((slot, index) => ({
					id: slot.id,
					dayOfWeek: slot.day,
					startTimeLocal: `${slot.openHour}:${slot.openMinute}`,
					endTimeLocal: `${slot.closeHour}:${slot.closeMinute}`
				}))
			});
			activeBranch.openingTimes = updatedTimes;
			data.branchesState.updateActiveBranch(activeBranch);
			toast.success(`Succesvol bijgewerkt`);
		} catch (error) {
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
