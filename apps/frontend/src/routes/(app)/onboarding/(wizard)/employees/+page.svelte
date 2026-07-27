<script lang="ts">
	import Employees from '$lib/components/Employees.svelte';
	import { PlusIcon } from '@lucide/svelte';
	import { getWizardState } from '../wizardState.svelte';

	const { data } = $props();
	const wizard = getWizardState();

	let newEmployee = $state<() => void>();

	wizard.setButtonAction(
		'Medewerker toevoegen',
		async () => {
			if (newEmployee) {
				newEmployee();
				return false;
			}
			return true;
		},
		PlusIcon
	);
</script>

<Employees variant="small" bind:newEmployee />
