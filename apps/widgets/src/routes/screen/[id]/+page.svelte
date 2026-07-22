<script lang="ts">
	import { page } from '$app/state';
	import WidgetWrapper from '$lib/components/WidgetWrapper.svelte';
</script>

<WidgetWrapper branchId={page.params.id} />
