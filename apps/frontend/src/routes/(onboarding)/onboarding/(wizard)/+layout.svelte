<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index';
	import { Button } from '$lib/components/ui/button/index';
	import { setWizardState } from './wizardState.svelte';
	import { fade, fly } from 'svelte/transition';

	let { children } = $props();

	// Maak de wizard state beschikbaar voor alle kind-pagina's
	const wizard = setWizardState();

	// Defineer hier je groepen en de bijbehorende substappen (routes)
	type Step = { id: string; path: string; title?: string; description?: string };
	type Group = { id: string; label: string; steps: Step[] };
	const groups: Group[] = [
		{
			id: 'company',
			label: 'Bedrijf',
			steps: [
				{
					id: 'company',
					path: '/onboarding/company',
					title: 'Bedrijf',
					description: 'Vul de bedrijfsnaam en adres in'
				}
			]
		},
		{
			id: 'settings',
			label: 'Instellingen', // Bevat 2 stappen -> krijgt een 2x zo brede balk!
			steps: [
				{ id: 'opening-hours', path: '/onboarding/opening-hours' },
				{ id: 'smtp', path: '/onboarding/smtp' }
			]
		},
		{
			id: 'products',
			label: 'Producten',
			steps: [{ id: 'products', path: '/onboarding/products' }]
		},
		{
			id: 'employees',
			label: 'Medewerkers',
			steps: [{ id: 'employees', path: '/onboarding/employees' }]
		}
	];

	// Maak een platte array van alle losse stappen voor navigatie en indexering
	let flatSteps = $derived(groups.flatMap((g) => g.steps));

	// Bepaal de huidige actieve stap index
	let currentStepIndex = $derived(flatSteps.findIndex((s) => page.url.pathname.includes(s.path)));

	let isFirstStep = $derived(currentStepIndex <= 0);
	let isLastStep = $derived(currentStepIndex === flatSteps.length - 1);

	function goBack() {
		if (!isFirstStep) {
			goto(flatSteps[currentStepIndex - 1].path);
		}
	}

	function goNext() {
		if (isLastStep) {
			goto('/dashboard');
		} else {
			goto(flatSteps[currentStepIndex + 1].path);
		}
	}

	/**
	 * Berekent het vulpercentage (0% tot 100%) van de progress bar voor een specifieke groep.
	 */
	function getGroupProgress(group: (typeof groups)[0]): number {
		const stepPaths = group.steps.map((s) => s.path);

		// Vind de indexen van de stappen in deze groep binnen flatSteps
		const indices = stepPaths.map((p) => flatSteps.findIndex((s) => s.path === p));
		const minIndex = Math.min(...indices);
		const maxIndex = Math.max(...indices);

		// Als we de groep nog niet bereikt hebben
		if (currentStepIndex < minIndex) return 0;
		// Als we voorbij deze groep zijn
		if (currentStepIndex > maxIndex) return 100;

		// Als we NU in deze groep zitten, bereken de relatieve voortgang binnen de groep
		const progressInGroup = currentStepIndex - minIndex + 1;
		return (progressInGroup / group.steps.length) * 100;
	}
</script>

<div class="mt-16 flex w-full flex-col items-center p-4 md:p-8">
	<div class="w-full max-w-3xl space-y-4" in:fade={{ duration: 300 }}>
		<div class="w-full space-y-1 px-4 md:px-12">
			<div class="flex w-full gap-3 text-sm font-semibold">
				{#each groups as group}
					{@const progress = getGroupProgress(group)}
					<span
						style="flex: {group.steps.length}"
						class="text-xs transition-colors duration-300 {progress > 0
							? 'font-bold text-neutral-900'
							: 'font-medium text-neutral-400'}"
					>
						{group.label}
					</span>
				{/each}
			</div>

			<div class="flex w-full gap-3">
				{#each groups as group}
					{@const progress = getGroupProgress(group)}
					<div
						style="flex: {group.steps.length}"
						class="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200"
					>
						<div
							class="bg-primary absolute top-0 left-0 h-full transition-all duration-300 ease-out"
							style="width: {progress}%"
						></div>
					</div>
				{/each}
			</div>
		</div>

		<div in:fly={{ y: 40, duration: 300 }}>
			<div class="grid grid-cols-1 grid-rows-1">
				{#key page.url.pathname}
					<div class="col-start-1 row-start-1 w-full" out:fade={{ duration: 100 }}>
						<Card.Root class=" w-full rounded-2xl border border-neutral-100 bg-white shadow-sm ">
							<Card.Content>
								<!-- HEADER -->
								<div class="mb-8 space-y-1">
									<h1 class="text-2xl font-bold tracking-tight text-neutral-900">
										{flatSteps[currentStepIndex]?.title}
									</h1>
									<p class="text-sm text-neutral-500">
										{flatSteps[currentStepIndex]?.description}
									</p>
								</div>
								{@render children()}

								<div class="mt-8 flex items-center justify-between">
									<Button disabled={isFirstStep} variant="outline" onclick={goBack} class="px-6"
										>Terug</Button
									>
									<Button onclick={goNext} disabled={!wizard.canGoNext}>
										{isLastStep ? 'Afronden' : 'Volgende'}
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				{/key}
			</div>
		</div>
	</div>
</div>
