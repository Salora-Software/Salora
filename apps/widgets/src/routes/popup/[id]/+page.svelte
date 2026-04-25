<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { cn } from '$lib/utils.js';
	import { page } from '$app/state';
	import WidgetWrapper from '$lib/components/WidgetWrapper.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	let open = $state(true);
</script>

<Button onclick={() => (open = true)}>Open Widget</Button>
<Dialog.Root bind:open>
	<Dialog.Content class={cn('w-max! max-w-none! p-0 border-none')}>
		<WidgetWrapper branchId={page.params.id} />
	</Dialog.Content>
</Dialog.Root>
