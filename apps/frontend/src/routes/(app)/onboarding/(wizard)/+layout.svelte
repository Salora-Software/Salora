<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index';
	import { Button } from '$lib/components/ui/button/index';
	import { setWizardState } from './wizardState.svelte';
	import { fade, fly } from 'svelte/transition';
	import { Loader2 } from 'lucide-svelte';

	let { children } = $props();

	// Maak de wizard state beschikbaar voor alle kind-pagina's
	const wizard = setWizardState();

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
			label: 'Instellingen',
			steps: [
				{
					id: 'opening-hours',
					path: '/onboarding/opening-hours',
					title: 'Openingstijden',
					description: 'Stel hier de openingstijden van je bedrijf in'
				},
				{
					id: 'smtp',
					path: '/onboarding/smtp',
					title: 'E-mail instellingen',
					description: 'Stel hier de SMTP-instellingen in'
				}
			]
		},
		{
			id: 'products',
			label: 'Producten',
			steps: [
				{
					id: 'products',
					path: '/onboarding/products',
					title: 'Producten',
					description: 'Voeg hier je producten toe'
				}
			]
		},
		{
			id: 'employees',
			label: 'Medewerkers',
			steps: [
				{
					id: 'employees',
					path: '/onboarding/employees',
					title: 'Medewerkers',
					description: 'Voeg hier je medewerkers toe'
				}
			]
		}
	];

	let flatSteps = $derived(groups.flatMap((g) => g.steps));
	let currentStepIndex = $derived(flatSteps.findIndex((s) => page.url.pathname.includes(s.path)));

	let isFirstStep = $derived(currentStepIndex <= 0);
	let isLastStep = $derived(currentStepIndex === flatSteps.length - 1);

	// Titel en Omschrijving ophalen (met fallback vanuit wizard state)
	let currentTitle = $derived(wizard.stepTitle || flatSteps[currentStepIndex]?.title || '');
	let currentDescription = $derived(
		wizard.stepDescription || flatSteps[currentStepIndex]?.description || ''
	);

	function goBack() {
		if (!isFirstStep) {
			wizard.reset();
			goto(flatSteps[currentStepIndex - 1].path);
		}
	}

	async function goNext() {
		// 1. Voer eerst de geregistreerde actie uit op de actieve pagina (bijv. API/oRPC call)
		const success = await wizard.executeOnNext();

		// 2. Als de actie succesvol was (of er was geen actie), navigeer door
		if (success) {
			if (isLastStep) {
				goto('/dashboard');
			} else {
				wizard.reset();
				goto(flatSteps[currentStepIndex + 1].path);
			}
		}
	}

	function getGroupProgress(group: Group): number {
		const stepPaths = group.steps.map((s) => s.path);
		const indices = stepPaths.map((p) => flatSteps.findIndex((s) => s.path === p));
		const minIndex = Math.min(...indices);
		const maxIndex = Math.max(...indices);

		if (currentStepIndex < minIndex) return 0;
		if (currentStepIndex > maxIndex) return 100;

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
						<Card.Root class="w-full rounded-2xl border border-neutral-100 bg-white shadow-sm">
							<Card.Content class="p-6 md:p-8">
								<div class="mb-8 space-y-1">
									<h1 class="text-2xl font-bold tracking-tight text-neutral-900">
										{currentTitle}
									</h1>
									{#if currentDescription}
										<p class="text-sm text-neutral-500">
											{currentDescription}
										</p>
									{/if}
								</div>

								{@render children()}

								<div class="mt-8 flex items-center justify-between">
									<Button
										disabled={isFirstStep || wizard.isSubmitting}
										variant="outline"
										onclick={goBack}
										class="px-6"
									>
										Terug
									</Button>

									<Button onclick={goNext} disabled={!wizard.canGoNext || wizard.isSubmitting}>
										{#if wizard.isSubmitting}
											<Loader2 class="h-4 w-4 animate-spin" />
											Verwerken...
										{:else}
											{isLastStep ? 'Afronden' : 'Volgende'}
										{/if}
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
