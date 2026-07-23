<script>
	import Employees from '$lib/components/Employees.svelte';

	const { data } = $props();
</script>

<Employees variant="small" employees={data.branches[0].members} {data} />
