<script lang="ts">
	import { trpcQuery } from '$lib/trpc';
	let query = trpcQuery.v1.getBranch.createQuery(
		{
			id: 'VT1Ts2XlqJBM8tnM0oGRQpZSHiYNJiju'
		},
		{
			refetchInterval: 1000
		}
	);
</script>

<pre>
<!-- {JSON.stringify(query, null, 2)} -->
</pre>
{#if query?.isLoading}
	<p>Loading...</p>
{:else if query?.isError}
	<p>Error: {query.error}</p>
{:else}
	<pre>{JSON.stringify(query?.data, null, 2)}</pre>
{/if}
