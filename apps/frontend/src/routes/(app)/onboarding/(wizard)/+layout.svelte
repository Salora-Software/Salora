<script lang="ts">
	import { getBranchesContext } from '$lib/context/branches-context';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index';
	import { Button } from '$lib/components/ui/button/index';
	import { setWizardState } from './wizardState.svelte';
	import { fade, fly } from 'svelte/transition';
	import Loader2 from '@solar-icons/svelte/linear/loader';
	import { orpc, orpcT } from '$lib/orpc';
	import { organization } from '$lib/auth-client';
	import {
		ONBOARDING_STEPS,
		onboardingStepIndexForPath,
		onboardingStepPath
	} from '$lib/onboarding';
	import { createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	let { children, data } = $props();
	const branchesState = getBranchesContext();

	// Maak de wizard state beschikbaar voor alle kind-pagina's
	const wizard = setWizardState();
	let branchesQuery = createQuery(() => orpcT.v1.organisation.getOrganisations.queryOptions());
	const orgId = $derived(
		branchesQuery.data?.find((branch) => (branch.onboardingStep ?? 0) > 0)?.id ||
			data.session?.session.activeOrganizationId ||
			branchesQuery.data?.[0]?.id ||
			''
	);

	// First run = the user does not have any organization yet. In that case the
	// first step has no "back" (there is nothing to go back to). When adding an
	// extra branch there is an existing org, so "back" exits the wizard.
	const isFirstRun = $derived((branchesQuery.data?.length ?? 0) === 0);

	type Step = (typeof ONBOARDING_STEPS)[number];
	type Group = { id: string; label: string; steps: Step[] };

	const flatSteps = ONBOARDING_STEPS;
	const groups: Group[] = flatSteps.map((step) => ({
		id: step.id,
		label: step.group,
		steps: [step]
	}));

	let currentStepIndex = $derived(onboardingStepIndexForPath(page.url.pathname));
	let isFirstStep = $derived(currentStepIndex <= 0);
	let isLastStep = $derived(currentStepIndex === flatSteps.length - 1);

	// Title en omschrijving ophalen (met fallback vanuit wizard state)
	let currentTitle = $derived(wizard.stepTitle || flatSteps[currentStepIndex]?.title || '');
	let currentDescription = $derived(
		wizard.stepDescription || flatSteps[currentStepIndex]?.description || ''
	);

	// Zorg dat de vestiging die in onboarding is ook de actieve vestiging is,
	// zodat stappen die op de sessie leunen (bijv. SMTP) de juiste org gebruiken.
	let ensuredActiveOrg = $state<string | null>(null);
	$effect(() => {
		const organizationId = orgId;
		if (!organizationId || ensuredActiveOrg === organizationId) return;
		ensuredActiveOrg = organizationId;
		if (data.session?.session.activeOrganizationId !== organizationId) {
			organization.setActive({ organizationId });
		}
	});

	async function resolveOrgId(): Promise<string> {
		const branches = await data.queryClient.fetchQuery(
			orpcT.v1.organisation.getOrganisations.queryOptions({})
		);
		return (
			branches.find((branch) => (branch.onboardingStep ?? 0) > 0)?.id ||
			data.session?.session.activeOrganizationId ||
			branches[0]?.id ||
			''
		);
	}

	async function persistStep(stepNumber: number) {
		try {
			const organizationId = await resolveOrgId();
			if (!organizationId) return;
			await orpc.v1.organisation.updateOnboardingStep({ organizationId, step: stepNumber });
		} catch (error) {
			// Progress persistence is best-effort; do not block the wizard.
			console.error('Kon onboarding-stap niet opslaan:', error);
		}
	}

	async function goBack() {
		if (isFirstStep) {
			if (isFirstRun) return;

			// Add-another mode: leaving the wizard should not bounce straight back
			// into onboarding, so activate a finished branch first when possible.
			const finishedBranch = branchesQuery.data?.find(
				(branch) => (branch.onboardingStep ?? 0) === 0
			);
			if (finishedBranch) {
				await organization.setActive({ organizationId: finishedBranch.id });
			}
			wizard.reset();
			goto('/');
			return;
		}

		wizard.reset();
		await persistStep(currentStepIndex);
		goto(flatSteps[currentStepIndex - 1].path);
	}

	async function goNext() {
		// 1. Voer eerst de geregistreerde actie uit op de actieve pagina (bijv. API/oRPC call)
		const success = await wizard.executeOnNext();
		if (!success) return;

		// 2. Laatste stap: onboarding afronden.
		if (isLastStep) {
			try {
				const organizationId = await resolveOrgId();
				if (organizationId) {
					await orpc.v1.organisation.finishOrganisation({ organizationId });
				}
				await data.queryClient.invalidateQueries({
					queryKey: orpcT.v1.organisation.getOrganisations.queryKey()
				});
				await branchesState.updateBranches(true);
				goto('/');
			} catch (error) {
				console.error('Kon onboarding niet afronden:', error);
				toast.error('Er is iets misgegaan bij het afronden van de onboarding');
			}
			return;
		}

		// 3. Bewaar de voortgang zodat een refresh/navigatie op de juiste stap terugkomt.
		await persistStep(currentStepIndex + 2);
		wizard.reset();
		goto(flatSteps[currentStepIndex + 1].path);
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
								<div class="mb-8 flex items-center justify-between space-y-1">
									<div>
										<h1 class="text-2xl font-bold tracking-tight text-neutral-900">
											{currentTitle}
										</h1>
										{#if currentDescription}
											<p class="text-sm text-neutral-500">
												{currentDescription}
											</p>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										{#each Object.entries(wizard?.buttonActions) as [name, { action, icon: Icon }]}
											<Button
												variant="outline"
												size="lg"
												class="mt-2"
												onclick={async () => {
													const success = await action();
													if (success) {
														goNext();
													}
												}}
											>
												<Icon />
												{name}
											</Button>
										{/each}
									</div>
								</div>

								{@render children()}

								<div class="mt-8 flex items-center justify-between">
									<Button
										disabled={(isFirstStep && isFirstRun) || wizard.isSubmitting}
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
