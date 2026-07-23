<script lang="ts">
	import TimeSlotScheduler, {
		type TimeSlot
	} from '$lib/components/ui/time-slot-scheduler/time-slot-scheduler.svelte';
	import { trpc } from '$lib/trpc';
	import { toast } from 'svelte-sonner';
	import { getWizardState } from '../wizardState.svelte.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { orpcT } from '$lib/orpc.js';

	let { data } = $props();
	const wizard = getWizardState();

	// Haal de vestiging op die momenteel in de onboarding zit
	let branchesQuery = createQuery(() => orpcT.v1.organisation.getOrganisations.queryOptions());
	let onboardingBranch = $derived(branchesQuery.data?.find((branch) => branch.onboardingStep));

	type BackendOpeningTime = NonNullable<typeof onboardingBranch>['openingTimes'][number];

	const defaultBusinessLayout: TimeSlot[] = [1, 2, 3, 4, 5].map((day) => ({
		day,
		openTime: '09:00',
		closeTime: '17:00'
	}));

	// Helper om UTC datum om te zetten naar HH:mm string in de specifieke timeZone van de branch
	function formatTime(dateInput: Date | string, timeZone?: string): string {
		const date = new Date(dateInput);
		return date.toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
		});
	}

	// Transformeer de openingstijden van het backend-formaat naar het TimeSlot-formaat
	function parseOpeningTimes(openingTimes?: BackendOpeningTime[], timeZone?: string): TimeSlot[] {
		if (!openingTimes || openingTimes.length === 0) {
			return [...defaultBusinessLayout];
		}

		return openingTimes.map((slot) => ({
			id: slot.id,
			day: slot.dayOfWeek,
			openTime: formatTime(slot.startTimeUtc, timeZone),
			closeTime: formatTime(slot.endTimeUtc, timeZone)
		}));
	}

	// Reactive state voor de schedules en te verwijderen items
	let businessHours = $state<TimeSlot[]>(
		parseOpeningTimes(onboardingBranch?.openingTimes, onboardingBranch?.timeZone)
	);
	let pendingDeletion = $state<string[]>([]);

	// Update de state als de geladen branch veranderd via data
	$effect(() => {
		if (onboardingBranch?.openingTimes) {
			businessHours = parseOpeningTimes(onboardingBranch.openingTimes, onboardingBranch.timeZone);
		}
	});

	// Registreer de opslag-actie bij de overkoepelende wizard
	$effect(() => {
		wizard.setOnNext(async () => {
			if (!onboardingBranch) {
				toast.error('Geen actieve vestiging gevonden');
				return false;
			}

			try {
				await trpc.v1.authenticated.schedule.updateOpeningTimes.mutate({
					organizationId: onboardingBranch.id,
					removeItems: pendingDeletion,
					openingTimes: businessHours.map((slot) => ({
						id: slot.id,
						dayOfWeek: slot.day,
						startTimeLocal: slot.openTime.padStart(5, '0'),
						endTimeLocal: slot.closeTime.padStart(5, '0')
					}))
				});
				// invalidate de query
				await data.queryClient.invalidateQueries({
					queryKey: orpcT.v1.organisation.getOrganisations.queryKey()
				});

				return true; // Navigeer door naar de volgende stap
			} catch (error) {
				toast.error('Er is iets misgegaan bij het opslaan van de openingstijden');
				return false; // Blijf op de huidige pagina
			}
		});
	});
</script>

<div class="space-y-4">
	<TimeSlotScheduler
		bind:schedules={businessHours}
		ondelete={(schedule) => {
			if (schedule.id) pendingDeletion = [...pendingDeletion, schedule.id];
		}}
	/>
</div>
