<script>
	import Products from '$lib/components/Products.svelte';
	let { data } = $props();
</script>

<h1 class="mt-5 mb-5 text-3xl font-semibold">Producten</h1>
<Products {data} />
