// apps/frontend/src/routes/(onboarding)/onboarding/(wizard)/wizardState.svelte.ts
import { getContext, setContext } from 'svelte';
import { toast } from 'svelte-sonner';

type StepAction = () => Promise<boolean | void> | boolean | void;

class WizardState {
	canGoNext = $state(true);
	isSubmitting = $state(false);

	// Dynamische header gegevens van de actieve pagina
	stepTitle = $state('');
	stepDescription = $state('');

	// De actie die gerund moet worden als op 'Volgende' geklikt wordt
	private onNextAction: StepAction | null = null;

	disableNext() {
		this.canGoNext = false;
	}

	enableNext() {
		this.canGoNext = true;
	}

	// Stel de titel/omschrijving in voor de actieve stap
	setStepMeta(meta: { title: string; description?: string }) {
		this.stepTitle = meta.title;
		this.stepDescription = meta.description ?? '';
	}

	// Registreer een async submit/save actie vanuit de kind-pagina
	setOnNext(action: StepAction | null) {
		this.onNextAction = action;
	}

	// Voer de actie uit
	async executeOnNext(): Promise<boolean> {
		if (!this.onNextAction) return true;

		this.isSubmitting = true;
		try {
			const result = await this.onNextAction();
			// Als de functie expliciet `false` returnt, stoppen we met navigeren
			return result !== false;
		} catch (error) {
			console.error('Fout bij uitvoeren van stap-actie:', error);
			toast.error('Er is een fout opgetreden bij het uitvoeren van de actie. Probeer het opnieuw.');
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	// Reset actie bij het wisselen van pagina
	reset() {
		this.onNextAction = null;
		this.canGoNext = true;
		this.isSubmitting = false;
	}
}

const WIZARD_KEY = Symbol('WIZARD_STATE');

export function setWizardState() {
	return setContext(WIZARD_KEY, new WizardState());
}

export function getWizardState() {
	return getContext<WizardState>(WIZARD_KEY);
}
