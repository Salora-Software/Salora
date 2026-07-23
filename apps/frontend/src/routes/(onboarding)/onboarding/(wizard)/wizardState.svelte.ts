// src/routes/(onboarding)/onboarding/(wizard)/wizardState.svelte.ts
import { getContext, setContext } from 'svelte';

class WizardState {
	canGoNext = $state(true);
	isSubmitting = $state(false);

	disableNext() {
		this.canGoNext = false;
	}

	enableNext() {
		this.canGoNext = true;
	}
}

const WIZARD_KEY = Symbol('WIZARD_STATE');

export function setWizardState() {
	return setContext(WIZARD_KEY, new WizardState());
}

export function getWizardState() {
	return getContext<WizardState>(WIZARD_KEY);
}
