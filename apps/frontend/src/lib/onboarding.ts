export type OnboardingStep = {
	id: string;
	path: string;
	title: string;
	description: string;
	group: string;
};

/**
 * Single source of truth for the onboarding wizard steps.
 *
 * The array index + 1 is the value persisted in `organization.onboardingStep`.
 * `null`/`0` means onboarding has finished, so a missing/old value falls back to
 * the first step.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
	{
		id: 'company',
		path: '/onboarding/company',
		title: 'Bedrijf',
		description: 'Vul de bedrijfsnaam en adres in',
		group: 'Bedrijf'
	},
	{
		id: 'opening-hours',
		path: '/onboarding/opening-hours',
		title: 'Openingstijden',
		description: 'Stel hier de openingstijden van je bedrijf in',
		group: 'Openingstijden'
	},
	{
		id: 'products',
		path: '/onboarding/products',
		title: 'Producten',
		description: 'Voeg hier je producten toe',
		group: 'Producten'
	},
	{
		id: 'smtp',
		path: '/onboarding/smtp',
		title: 'E-mail instellingen',
		description: 'Stel hier optioneel je eigen e-mailserver in',
		group: 'E-mail'
	},
	{
		id: 'employees',
		path: '/onboarding/employees',
		title: 'Medewerkers',
		description: 'Voeg hier je medewerkers toe',
		group: 'Medewerkers'
	}
];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/** Clamp a persisted onboarding step to a valid 1-based step number. */
export function onboardingStepNumber(step: number | null | undefined): number {
	if (!step || step < 1) return 1;
	return Math.min(Math.floor(step), ONBOARDING_STEP_COUNT);
}

/** Route path for a persisted onboarding step (1-based). */
export function onboardingStepPath(step: number | null | undefined): string {
	return ONBOARDING_STEPS[onboardingStepNumber(step) - 1].path;
}

/** 0-based index of the step that matches the current pathname. */
export function onboardingStepIndexForPath(pathname: string): number {
	const index = ONBOARDING_STEPS.findIndex((step) => pathname.includes(step.path));
	return index === -1 ? 0 : index;
}
