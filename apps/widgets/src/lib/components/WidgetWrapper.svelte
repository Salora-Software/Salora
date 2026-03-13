<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { trpc } from '$lib/trpc';
	import BookingWidget from './BookingWidget.svelte';
	import type { Prisma } from '@salora/database';
	import { BitsConfig } from 'bits-ui';
	let { variant = 'widget', branchId } = $props();
	let branchData: Prisma.OrganizationGetPayload<{
		include: {
			services: true;
			members: {
				include: {
					user: true;
				};
			};
		};
	}> | null = $state(null);
	let loading = $state(true);

	// Maak de data beschikbaar voor alle diepe componenten (simuleert SSR data)
	setContext('branch', () => branchData);

	onMount(async () => {
		try {
			// Gebruik v1.getBranch zoals in de originele layout.server.ts
			branchData = (await trpc.v1.getBranch.query({
				id: branchId
			})) as unknown as Prisma.OrganizationGetPayload<{
				include: {
					services: true;
					members: {
						include: {
							user: true;
						};
					};
				};
			}>;
		} catch (e) {
			console.error('Error fetching branch:', e);
		} finally {
			loading = false;
		}
	});

	let container = $state<HTMLElement | undefined>(undefined);
</script>

<BitsConfig defaultPortalTo={container}>
	<div bind:this={container} class="salora-widget-root">
		{#if loading}
			<div>Laden...</div>
		{:else}
			<div class="w-4xl h-125 max-w-full">
				<BookingWidget branch={branchData} />
			</div>
		{/if}
	</div>
</BitsConfig>
