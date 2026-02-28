<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { ArrowLeft, Edit, Info, LoaderCircle, User } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { DateTime } from 'luxon';
	import * as Card from '$lib/components/ui/card/';
	import { Tooltip } from '$lib/components/ui/tooltip';
	import TooltipTrigger from '$lib/components/ui/tooltip/tooltip-trigger.svelte';
	import TooltipContent from '$lib/components/ui/tooltip/tooltip-content.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getErrorMessage, t } from '$lib/translation.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { trpcQuery } from '$lib/trpc';
	import EditCustomerModal from '$lib/components/EditCustomerModal.svelte';
	import type { Customer } from '$lib/types.js';

	const { data, children } = $props();
	let activeBranch = $state(data.branchesState.getActiveBranch());
	const organizationId = $derived(activeBranch?.id || '');
	const customerId = $derived(page.params.id);

	// State for edit modal
	let isEditModalOpen = $state(false);
	function openEditModal() {
		isEditModalOpen = true;
	}

	// Use TRPC to fetch customer data
	const customerQuery = $derived(
		trpcQuery.v1.authenticated.customers.getCustomer.createQuery(
			{
				id: customerId,
				organizationId
			},
			{
				enabled: !!organizationId && !!customerId,
				refetchOnWindowFocus: false,
				queryKey: ['getCustomer', customerId, organizationId]
			}
		)
	);

	// Get the customer data for editing
	const customerData = $derived<Customer | null>(
		customerQuery.data?.customer
			? {
					id: customerQuery.data.customer.id,
					name: customerQuery.data.customer.name,
					email: customerQuery.data.customer.email,
					phone: customerQuery.data.customer.phone,
					address: customerQuery.data.customer.address,
					createdAt: customerQuery.data.customer.createdAt,
					statistics: customerQuery.data.customer.statistics,
					bookings: customerQuery.data.customer.bookings
				}
			: null
	);

	// Derived loading state
	const isLoading = $derived(customerQuery.isLoading || customerQuery.isError);
	// Format customer data for display
	const customerInfo = $derived(
		customerQuery.data?.customer
			? {
					naam: customerQuery.data.customer.name,
					telefoon: customerQuery.data.customer.phone || '',
					email: customerQuery.data.customer.email,
					adres: customerQuery.data.customer.address || '',
					klantnummer: customerQuery.data.customer.id,
					createdAt: DateTime.fromJSDate(customerQuery.data.customer.createdAt).toFormat(
						'dd-MM-yyyy'
					),
					lastBooking: customerQuery.data.customer.statistics.lastBookingDate
						? DateTime.fromJSDate(customerQuery.data.customer.statistics.lastBookingDate).toFormat(
								'dd-MM-yyyy'
							)
						: 'Geen boekingen',
					reliabilityRating: customerQuery.data.customer.statistics.reliabilityRating,
					totalBookings: customerQuery.data.customer.statistics.bookingCount,
					averageBookingValue: customerQuery.data.customer.statistics.averageBookingValue
						? `€${customerQuery.data.customer.statistics.averageBookingValue.toFixed(2)}`
						: '€0.00'
				}
			: {
					naam: '',
					telefoon: '',
					email: '',
					adres: '',
					klantnummer: '',
					createdAt: '',
					lastBooking: '',
					reliabilityRating: 'Gemiddeld',
					totalBookings: 0,
					averageBookingValue: '€0.00'
				}
	);
	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	const tabs = ['overview', 'bookings', 'notes', 'notifications'];
</script>

<div class="mt-4 mb-4 flex flex-col gap-2 md:mt-5 md:mb-6 md:flex-row md:items-center md:gap-4">
	<Button variant="outline" class="h-10 w-10" href="/customers">
		<ArrowLeft class="h-4 w-4" />
	</Button>
	<h1 class="text-3xl font-semibold">Klantinformatie</h1>
</div>
<!-- Edit Customer Modal -->
<EditCustomerModal
	bind:open={isEditModalOpen}
	customer={customerData}
	{organizationId}
	queryClient={data.queryClient}
	onUpdate={() => {
		data.queryClient.invalidateQueries({
			queryKey: ['getCustomer', customerId, organizationId]
		});
	}}
/>
<!-- KOPTEKST SECTIE -->
<div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-[auto_auto_1fr] md:gap-6">
		<!-- Avatar -->
		<div class="flex-shrink-0">
			{#if isLoading}
				<Skeleton class="h-24 w-24 rounded-lg" />
			{:else}
				<div class="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-200 text-4xl">
					<User class="h-16 w-16 text-gray-400" />
				</div>
			{/if}
		</div>
		<!-- Klant Info -->
		<div class="grid h-full flex-1 grid-cols-1 gap-y-2 md:grid-cols-[auto_auto] md:gap-x-2">
			<div class="flex items-center gap-3">
				{#if isLoading}
					<Skeleton class="h-8 w-40 rounded" />
				{:else}
					<h1 class="text-2xl font-bold">{customerInfo.naam}</h1>
				{/if}
			</div>
			<Button
				variant="outline"
				size="xs"
				class=" ml-auto  flex max-w-32 items-center rounded border px-2 text-xs"
				disabled={isLoading}
				onclick={openEditModal}
			>
				<Edit class="h-4 w-4" /> Bewerk klant
			</Button>
			<div class="col-span-2 my-1 flex flex-wrap gap-2 text-sm">
				{#if isLoading}
					<Skeleton class="h-5 w-72.75 rounded" />
					<Skeleton class="h-4 w-4 rounded-full" />
				{:else}
					<span class="font-semibold">{customerInfo.klantnummer}</span>
					<Tooltip>
						<TooltipTrigger>
							<Info class="h-4 w-4 cursor-pointer text-gray-500" />
						</TooltipTrigger>
						<TooltipContent class="max-w-50.5 ">
							De klantnummer is uniek en wordt gebruikt voor identificatie.
						</TooltipContent>
					</Tooltip>
				{/if}
			</div>
			<div class="text-muted-foreground flex flex-col justify-end text-xs">
				<p>Telefoon</p>
				{#if isLoading}
					<Skeleton class="h-4 w-24 rounded" />
				{:else}
					<a class=" font-semibold hover:underline" href="tel:{customerInfo.telefoon}"
						>{customerInfo.telefoon}</a
					>
				{/if}
			</div>
			<div class="text-muted-foreground flex flex-col items-end justify-end text-xs md:items-start">
				<p>Email</p>
				{#if isLoading}
					<Skeleton class="h-4 w-32 rounded" />
				{:else}
					<a
						class="max-w-32 overflow-hidden font-semibold
					text-ellipsis hover:underline"
						href="mailto:{customerInfo.email}">{customerInfo.email}</a
					>
				{/if}
			</div>
		</div>
		<div
			class="text-muted-foreground grid grid-cols-[1fr_auto] gap-y-2 md:grid-cols-3 md:grid-rows-[1fr_auto]"
		>
			<div class="mt-1 text-xs">
				<p>Adres</p>
				{#if isLoading}
					<Skeleton class="h-4 w-36 rounded" />
				{:else}
					<span class="font-semibold">{customerInfo.adres}</span>
				{/if}
			</div>
			<div class="mt-1 flex flex-col items-end text-xs md:items-start">
				<p>Klant sinds</p>
				{#if isLoading}
					<Skeleton class="h-4 w-20 rounded" />
				{:else}
					<span class="font-semibold">{customerInfo.createdAt}</span>
				{/if}
			</div>

			<div class="mt-1 text-xs">
				<p>Betrouwbaarheid</p>
				{#if isLoading}
					<Skeleton class="h-5 w-16 rounded" />
				{:else}
					<span class="rounded bg-green-50 px-2 font-semibold text-green-700"
						>{customerInfo.reliabilityRating}</span
					>
				{/if}
			</div>
			<div class="mt-1 flex flex-col items-end justify-end text-xs md:items-start">
				<p>Laatste boeking</p>
				{#if isLoading}
					<Skeleton class="h-4 w-20 rounded" />
				{:else}
					<span class="font-semibold">{customerInfo.lastBooking}</span>
				{/if}
			</div>
			<div class="mt-1 text-xs">
				<p>Totaal aantal boekingen</p>
				{#if isLoading}
					<Skeleton class="h-4 w-8 rounded" />
				{:else}
					<span class="font-semibold">{customerInfo.totalBookings}</span>
				{/if}
			</div>
			<div class="mt-1 flex flex-col items-end justify-end text-xs md:items-start">
				<p>Gemiddelde boekingswaarde</p>
				{#if isLoading}
					<Skeleton class="h-5 w-16 rounded" />
				{:else}
					<span class="rounded bg-yellow-50 px-2 font-semibold text-yellow-700"
						>{customerInfo.averageBookingValue}</span
					>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="mt-4 flex gap-2 md:mt-8 md:ml-10">
		{#each tabs as tab}
			<button
				class={cn(
					'cursor-pointer rounded-t px-3 py-2 text-[0.58rem] font-medium whitespace-nowrap sm:text-xs md:px-4 md:py-2 md:text-sm',
					page.url.pathname.split('/').pop() === tab
						? 'bg-background -mb-px border-x border-t  '
						: 'hover: text-muted-foreground'
				)}
				onclick={() => goto(`/customers/${page.params.id}/${tab}`)}
			>
				{t.pages[tab as keyof typeof t.pages]}
			</button>
		{/each}
	</div>

	<!-- Hoofdinhoud -->
	<Card.Root>
		<Card.Content>
			{#if isLoading}
				<div class="flex flex-col items-center justify-center py-16">
					<LoaderCircle class="text-muted-foreground mb-4 h-12 w-12 animate-spin" />
					<p class="text-muted-foreground text-sm">Gegevens worden geladen...</p>
				</div>
			{:else}
				{@render children()}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
