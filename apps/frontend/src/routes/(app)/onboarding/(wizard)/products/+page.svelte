<script lang="ts">
	import Products from '$lib/components/Products.svelte';
	import { PlusIcon } from '@lucide/svelte';
	import { getWizardState } from '../wizardState.svelte.js';
	const wizard = getWizardState();

	let { data } = $props();
	let newService = $state<() => void>();

	wizard.setButtonAction(
		'Dienst toevoegen',
		async () => {
			if (newService) {
				newService();
				return false;
			}
			return true;
		},
		PlusIcon
	);
</script>

<Products queryClient={data.queryClient} hideHeader bind:newService />
