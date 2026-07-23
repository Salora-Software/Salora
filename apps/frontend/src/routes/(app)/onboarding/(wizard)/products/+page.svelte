<script lang="ts">
	import Products from '$lib/components/Products.svelte';

	const { data } = $props();
</script>

<Products variant="no-card" {data} />
