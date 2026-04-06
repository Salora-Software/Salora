<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import { Loader } from 'lucide-svelte';
	import { t } from '$lib/translation.js';
	import { toast } from 'svelte-sonner';
	import timezones from '$lib/timezones.json';
	import * as Select from '$lib/components/ui/select';
	import { NumberInput } from '$lib/components/ui/number-input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { trpc, trpcQuery } from '$lib/trpc.js';
	let { data } = $props();

	let activeBranch = $state(data.branchesState.getActiveBranch());
	let generalSettings = $derived(
		trpcQuery.v1.authenticated.settings.getGeneralSettings.createQuery({
			organizationId: activeBranch?.id
		})
	);

	const DEFAULT_FORM = {
		appointmentStatus: 'PENDING',
		minimumBookingTime: '0',
		bookingPeriod: 0,
		timeZone: 'UTC',
		autoShiftTimeSlot: false
	};

	const toForm = (settings: typeof generalSettings.data) => {
		if (!settings) return DEFAULT_FORM;
		return {
			appointmentStatus: settings.appointmentStatus ?? DEFAULT_FORM.appointmentStatus,
			minimumBookingTime:
				settings.minimumBookingTime?.toString() ?? DEFAULT_FORM.minimumBookingTime,
			bookingPeriod: settings.bookingPeriod ?? DEFAULT_FORM.bookingPeriod,
			timeZone: settings.timeZone ?? DEFAULT_FORM.timeZone,
			autoShiftTimeSlot: settings.autoShiftTimeSlot ?? DEFAULT_FORM.autoShiftTimeSlot
		};
	};

	const toPayload = (organizationId: string, currentForm: typeof form) => ({
		organizationId,
		timeZone: currentForm.timeZone || DEFAULT_FORM.timeZone,
		minimumBookingTime: Number.parseFloat(currentForm.minimumBookingTime) || 0,
		bookingPeriod: currentForm.bookingPeriod ?? DEFAULT_FORM.bookingPeriod,
		appointmentStatus: currentForm.appointmentStatus || DEFAULT_FORM.appointmentStatus,
		autoShiftTimeSlot: currentForm.autoShiftTimeSlot
	});

	let form = $state(toForm(generalSettings.data));
	let isDirty = $derived(() => {
		const base = toForm(generalSettings.data);
		return (
			base.appointmentStatus !== form.appointmentStatus ||
			base.minimumBookingTime !== form.minimumBookingTime ||
			base.bookingPeriod !== form.bookingPeriod ||
			base.timeZone !== form.timeZone ||
			base.autoShiftTimeSlot !== form.autoShiftTimeSlot
		);
	});
	let settingsMutation = trpcQuery.v1.authenticated.settings.updateGeneralSettings.createMutation({
		onSuccess() {
			toast.success('Instellingen opgeslagen');
			generalSettings.refetch();
		},
		onError() {
			toast.error('Er is een fout opgetreden bij het opslaan van de instellingen');
		}
	});

	$effect(() => {
		const data = generalSettings.data;
		if (!data) return;
		form = toForm(data);
	});

	const timeInputs = [
		{ label: '0 minuten', value: '0.0001' },
		{ label: '5 minuten', value: '0.0833' },
		{ label: '10 minuten', value: '0.1667' },
		{ label: '15 minuten', value: '0.25' },
		{ label: '30 minuten', value: '0.5' },
		{ label: '1 uur', value: '1' },
		{ label: '2 uur', value: '2' },
		{ label: '4 uur', value: '4' },
		{ label: '8 uur', value: '8' },
		{ label: '12 uur', value: '12' },
		{ label: '1 dag', value: '24' },
		{ label: '2 dagen', value: '48' },
		{ label: '4 dagen', value: '96' },
		{ label: '1 week', value: '168' },
		{ label: '2 weken', value: '336' },
		{ label: '1 maand', value: '720' },
		{ label: '2 maanden', value: '1440' }
	];

	data.branchesState.onBranchChange(async () => {
		activeBranch = data.branchesState.getActiveBranch();
	});
</script>

<h2 class="text-2xl font-semibold">{t.pages.general}</h2>
<p class="text-muted-foreground max-w-150 text-sm">
	Stel hier de algemene instellingen van uw boekingssysteem in.
</p>
<Separator class="my-4" />
<h3 class="text-md font-semibold">Standaard status van afspraak</h3>
<p class="mb-1 text-sm text-gray-500">De standaard status die een nieuwe afspraak krijgt.</p>
<Select.Root type="single" bind:value={form.appointmentStatus}>
	<Select.Trigger class="mb-8 w-45" disabled={generalSettings.isLoading}>
		{#if form.appointmentStatus}
			{t.database.enums.bookingStatus[
				form.appointmentStatus as keyof typeof t.database.enums.bookingStatus
			]}
		{:else}
			{t.database.enums.bookingStatus.PENDING}
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#each Object.keys(t.database.enums.bookingStatus) as key}
			<Select.Item value={key}>
				{t.database.enums.bookingStatus[key as keyof typeof t.database.enums.bookingStatus]}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
<h3 class="text-md font-semibold">Minimale tijd die nodig is om te boeken</h3>
<p class="mb-1 text-sm text-gray-500">De minimale tijd die nodig is om een afspraak te boeken.</p>
<Select.Root type="single" bind:value={form.minimumBookingTime}>
	<Select.Trigger class="mb-8 w-45" disabled={generalSettings.isLoading}>
		{#if form.minimumBookingTime}
			{timeInputs.find((input) => input.value === form.minimumBookingTime)?.label}
		{:else}
			{t.database.enums.bookingStatus.PENDING}
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#each timeInputs as input}
			<Select.Item value={input.value}>
				{input.label}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
<h3 class="text-md font-semibold">Periode beschikbaar voor nieuwe boekingen</h3>
<p class="mb-1 text-sm text-gray-500">
	De periode waarin nieuwe boekingen kunnen worden gemaakt in dagen.
</p>
<NumberInput
	class="mb-8 w-45"
	bind:value={form.bookingPeriod}
	disabled={generalSettings.isLoading}
/>
<div class="mb-8 flex w-full justify-between">
	<div class="">
		<h3 class="text-md font-semibold">Automatisch verschuiven van tijdslot</h3>
		<p class="mb-1 text-sm text-gray-500">
			Schakel in om de tijdslotten automatisch te verschuiven als er al een andere afspraak is die
			van andere duur is.
		</p>
	</div>
	<Switch
		id="airplane-mode"
		disabled={generalSettings.isLoading}
		bind:checked={form.autoShiftTimeSlot}
	/>
</div>
<h3 class="text-md font-semibold">Tijdzone</h3>
<p class="mb-1 text-sm text-gray-500">De tijdzone die wordt gebruikt voor het boekingssysteem.</p>
<Select.Root type="single" bind:value={form.timeZone}>
	<Select.Trigger class="mb-8 w-45" disabled={generalSettings.isLoading}>
		{#if form.timeZone}
			{form.timeZone}
		{:else}
			{t.database.enums.bookingStatus.PENDING}
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#each timezones as timezone}
			<Select.Item value={timezone}>
				{timezone}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
<Button
	class="h-9 w-25"
	disabled={settingsMutation.isPending || !activeBranch?.id || !generalSettings.data || !isDirty()}
	onclick={() => {
		if (!activeBranch?.id || !generalSettings.data) return;
		settingsMutation.mutate(toPayload(activeBranch.id, form));
	}}
>
	{#if settingsMutation.isPending}
		<Loader class="animate-spin" />
	{:else}
		Opslaan
	{/if}
</Button>

<!-- <Button
	onclick={() => {
		trpc.v2.authenticated.import.importAmeliaData.mutate({
			organizationId: activeBranch?.id || ''
		});
	}}>Importeren</Button
> -->

<style>
	@keyframes fadeOut {
		0% {
			background-color: #ffe1009c;
		}
		50% {
			background-color: #ffe1009c;
		}
		100% {
			background-color: transparent;
		}
	}
</style>
