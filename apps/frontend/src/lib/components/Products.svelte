<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { LoaderCircle, Plus } from '@lucide/svelte';
	import { Separator } from '$lib/components/ui/separator';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { SettingsInput } from './ui/settings-input';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type ColumnDef, getCoreRowModel } from '@tanstack/table-core';
	import { type DndEvent, dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import { createSvelteTable, renderComponent } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import ProductsAction from './Products-action.svelte';
	import * as Select from './ui/select';
	import { Badge } from './ui/badge';
	import ProductsGrabber from './Products-grabber.svelte';
	import { flip } from 'svelte/animate';
	import type { QueryClient } from '@tanstack/svelte-query';

	import { orpcT } from '$lib/orpc';
	import { createQuery, createMutation } from '@tanstack/svelte-query';
	import { getSessionContext } from '$lib/context/session-context';

	let {
		queryClient,
		hideHeader,
		newService = $bindable()
	}: {
		queryClient: QueryClient;
		hideHeader?: Boolean;
		newService?: () => void;
	} = $props();

	newService = () => {
		resetForm();
		formState.isSheetOpen = true;
	};

	// --- Queries (oRPC) ---
	let session = getSessionContext();
	let branchesQuery = createQuery(() => orpcT.v1.organisation.getOrganisations.queryOptions());

	let orgId = $derived(session.activeOrganizationId || branchesQuery.data?.[0]?.id || '');
	let activeBranch = $derived(branchesQuery.data?.find((b) => b.id === orgId));

	let servicesQuery = createQuery(() => ({
		...orpcT.v1.service.getServices.queryOptions({ input: { organizationId: orgId } }),
		enabled: !!orgId
	}));

	// --- Dynamische Types ---
	type ServiceType = NonNullable<typeof servicesQuery.data>[number];

	let services = $derived(
		servicesQuery.data?.sort((a, b) => a.sortingIndex - b.sortingIndex) || []
	);

	// --- Helpers voor Formatters ---
	function formatPrice(value: string) {
		let finalValue = value.replace(/[^0-9]/g, '');
		let number = Math.round(parseFloat(finalValue)) / 100 || 0;
		number = number < 5000 ? number : 5000;
		return number
			.toFixed(2)
			.replace('.', ',')
			.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	function formatDuration(value: string, isDeleting: boolean = false) {
		let numericValue = value.replace(/\D/g, '');
		if (isDeleting) numericValue = numericValue.slice(0, -1);
		return (parseInt(numericValue) || '') + ' minuten';
	}

	function parsePrice(value: string) {
		return parseFloat(value.replace(/[^0-9]/g, '')) / 100;
	}

	// --- Form State ---
	let formState = $state({
		name: '',
		price: '0,00',
		duration: '30 minuten',
		assignEmployees: [] as string[],
		assignEmployeesOpen: false,
		isSheetOpen: false,
		isSaving: false,
		editingId: undefined as string | undefined
	});

	// Mapt formState naar het verwachte format voor ProductsAction component
	let actionValues = $derived({
		name: { value: formState.name },
		price: { value: formState.price, formatter: formatPrice },
		duration: { value: formState.duration, formatter: formatDuration },
		save: { loading: formState.isSaving },
		sheet: {
			active: formState.isSheetOpen,
			loading: false,
			editing: formState.editingId
		}
	});

	// --- Mutaties (oRPC) ---
	const invalidateServices = () =>
		queryClient.invalidateQueries({
			queryKey: orpcT.v1.service.getServices.key({ input: { organizationId: orgId } })
		});

	const deleteService = createMutation(() => ({
		...orpcT.v1.service.deleteService.mutationOptions(),
		onSuccess: invalidateServices
	}));

	const createService = createMutation(() => ({
		...orpcT.v1.service.createService.mutationOptions(),
		onSuccess: invalidateServices
	}));

	const updateService = createMutation(() => ({
		...orpcT.v1.service.updateService.mutationOptions(),
		onSuccess: invalidateServices
	}));

	// --- UI State & Logic ---
	let sliderContent = $state({
		active: 'Details',
		items: [{ label: 'Details' }, { label: 'Duur & Prijs' }]
	});

	const flipDurationMs = 300;
	const dropTargetStyle = { border: 'none' };

	function handleDndFinalize(e: CustomEvent<DndEvent>) {
		let newServices = (e.detail.items as ServiceType[]).map((item, index) => ({
			...item,
			sortingIndex: index
		}));

		for (let i = 0; i < newServices.length; i++) {
			if (newServices[i].sortingIndex !== services[i].sortingIndex) {
				updateService.mutate({
					organizationId: orgId,
					id: newServices[i].id,
					name: newServices[i].name,
					price: newServices[i].price,
					duration: newServices[i].duration,
					employeeIds: newServices[i].employees.map((e) => e.id),
					sortingIndex: i
				});
			}
		}
		services = newServices;
	}

	// --- Tables ---
	const columns: ColumnDef<ServiceType>[] = [
		{
			accessorKey: 'drag',
			header: 'Orde',
			cell: () =>
				renderComponent(ProductsGrabber, { size: '18px', class: 'text-muted-foreground' }),
			enableResizing: false
		},
		{ accessorKey: 'name', header: 'Dienst' },
		{
			accessorKey: 'price',
			header: 'Prijs',
			cell: ({ row }) =>
				new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(
					row.original.price
				)
		},
		{
			accessorKey: 'duration',
			header: 'Duur',
			cell: ({ row }) => `${row.original.duration} min`
		},
		{ accessorKey: 'id', header: 'ID' },
		{
			id: 'actions',
			cell: ({ row }) =>
				renderComponent(ProductsAction, {
					id: row.original.id,
					name: row.original.name,
					price: row.original.price,
					duration: row.original.duration,
					values: actionValues,
					type: 'service'
				})
		}
	];

	let table = $derived(
		createSvelteTable({ data: services, columns, getCoreRowModel: getCoreRowModel() })
	);

	function resetForm() {
		formState.name = '';
		formState.price = '0,00';
		formState.duration = '30 minuten';
		formState.assignEmployees = [];
		formState.editingId = undefined;
	}

	async function handleSave() {
		if (!orgId) {
			toast.error('Er is geen actieve vestiging');
			return;
		}

		formState.isSaving = true;
		try {
			const payload = {
				organizationId: orgId,
				name: formState.name,
				price: parsePrice(formState.price),
				duration: parseInt(formState.duration),
				employeeIds: formState.assignEmployees,
				sortingIndex: services.length > 0 ? Math.min(...services.map((s) => s.sortingIndex)) - 1 : 0
			};

			if (!formState.editingId) {
				await createService.mutateAsync(payload);
			} else {
				await updateService.mutateAsync({ ...payload, id: formState.editingId });
			}

			toast.success(`Dienst succesvol ${formState.editingId ? 'bijgewerkt' : 'toegevoegd'}`);
			formState.isSheetOpen = false;
			resetForm();
		} catch (e) {
			toast.error('Er is een fout opgetreden.');
		} finally {
			formState.isSaving = false;
		}
	}

	function editService(service: ServiceType) {
		formState.editingId = service.id;
		formState.name = service.name;
		formState.price = formatPrice((service.price * 100).toString());
		formState.duration = formatDuration(service.duration.toString());
		formState.assignEmployees = service.employees.map((e) => e.id);
		formState.isSheetOpen = true;
	}
</script>

{#if !hideHeader}
	<div class="flex flex-wrap items-center justify-between gap-4 py-4">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-bold tracking-tight">Diensten</h2>
		</div>
		<div class="actions">
			<Button
				variant="outline"
				class="text-sm"
				onclick={() => {
					resetForm();
					formState.isSheetOpen = true;
				}}
			>
				<Plus />
				Dienst toevoegen
			</Button>
		</div>
	</div>
{/if}

{#if services.length > 0 && !servicesQuery.isLoading}
	<div class="w-full">
		<Table.Root class="w-full ">
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						<Table.Head class="w-12.5">Orde</Table.Head>
						<Table.Head class="w-50">Dienst</Table.Head>
						<Table.Head>Prijs</Table.Head>
						<Table.Head class="w-30">Duur</Table.Head>
						<Table.Head>ID</Table.Head>
						<Table.Head class="w-12.5">Acties</Table.Head>
					</Table.Row>
				{/each}
			</Table.Header>
			<tbody
				use:dragHandleZone={{ items: services, flipDurationMs, dropTargetStyle }}
				onconsider={(e) => (services = e.detail.items as ServiceType[])}
				onfinalize={handleDndFinalize}
				class="[&_tr:last-child]:border-0"
			>
				{#each services as row (row.id)}
					<tr animate:flip={{ duration: flipDurationMs }} onclick={() => editService(row)}>
						<Table.Cell>
							<div
								aria-label="drag-handle"
								use:dragHandle
								class="handle bg-secondary flex size-7 items-center justify-center rounded-md"
							>
								<ProductsGrabber size="18px" class="text-muted-foreground" />
							</div>
						</Table.Cell>
						<Table.Cell>{row.name}</Table.Cell>
						<Table.Cell>
							{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(
								row.price
							)}
						</Table.Cell>
						<Table.Cell>{formatDuration(row.duration.toString())}</Table.Cell>
						<Table.Cell>{row.id}</Table.Cell>
						<Table.Cell>
							<ProductsAction
								id={row.id}
								name={row.name}
								price={row.price}
								duration={row.duration}
								values={formState}
								type="service"
								onEdit={() => editService(row)}
								onDelete={() => deleteService.mutate({ organizationId: orgId, id: row.id })}
							/>
						</Table.Cell>
					</tr>
				{/each}
			</tbody>
		</Table.Root>
	</div>
{:else}
	<Card.Content class="w-full">
		{#if servicesQuery.isLoading}
			<div class="flex h-full w-full items-center justify-center">
				<LoaderCircle class="text-muted-foreground h-12 w-12 animate-spin" />
			</div>
		{:else if services.length === 0}
			<div class="flex h-full w-full items-center justify-center">
				<div class="flex flex-col items-center gap-1 text-center">
					<h3 class="text-2xl font-bold tracking-tight">Je hebt geen diensten</h3>
					<p class="text-muted-foreground mb-5 text-sm">
						Voeg diensten toe om ze te verkopen aan je klanten.
					</p>
					<Button
						onclick={() => {
							resetForm();
							formState.isSheetOpen = true;
						}}
					>
						<Plus /> Dienst toevoegen
					</Button>
				</div>
			</div>
		{/if}
	</Card.Content>
{/if}

<Sheet.Root bind:open={formState.isSheetOpen}>
	<Sheet.Content side="right" class="w-full max-w-full sm:w-125">
		<div>
			<Sheet.Header>
				<Sheet.Title>
					{formState.editingId ? 'Dienst bijwerken' : 'Dienst toevoegen'}
				</Sheet.Title>
			</Sheet.Header>
			<ScrollArea class="h-[calc(100vh-56px-7rem)] max-w-full rounded-md px-3">
				{#each sliderContent.items as item}
					<button
						class="min-w-max-content relative mt-4 mr-4 cursor-pointer rounded-md"
						onclick={() => (sliderContent.active = item.label)}
					>
						<h3
							class="text-md text-muted-foreground"
							class:active={item.label === sliderContent.active}
							class:text-foreground={item.label === sliderContent.active}
						>
							{item.label}
						</h3>
					</button>
				{/each}
				<Separator class="mb-4" />

				<div class="grid gap-4 py-4">
					{#if sliderContent.active === 'Details'}
						<SettingsInput
							title="Naam"
							type="input"
							class="w-full"
							required
							bind:value={formState.name}
						/>

						<div>
							<h3 class="text-md font-semibold">Aangewezen medewerkers</h3>
							<Select.Root
								type="multiple"
								bind:value={formState.assignEmployees}
								bind:open={formState.assignEmployeesOpen}
							>
								<Select.Trigger class="h-auto min-h-10 w-full px-3 py-1.5">
									<div class="flex flex-wrap gap-2">
										{#if formState.assignEmployees.length > 0}
											{#each formState.assignEmployees as option}
												<Badge
													variant="outline"
													class="flex items-center gap-1 px-2 py-0.5 text-xs font-normal"
													onclick={async (e) => {
														e.stopPropagation();
														await tick();
														formState.assignEmployees = formState.assignEmployees.filter(
															(item) => item !== option
														);
													}}
												>
													<Plus class="rotate-45" size="13" />
													<span class="max-w-32 truncate">
														{activeBranch?.members.find((m) => m.id === option)?.user.name ||
															option}
													</span>
												</Badge>
											{/each}
										{:else}
											<span class="text-muted-foreground">Selecteer...</span>
										{/if}
									</div>
								</Select.Trigger>
								<Select.Content>
									{#each activeBranch?.members || [] as member}
										<Select.Item value={member.id}>{member.user.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{:else}
						<div>
							<Label for="duration" class="text-md font-semibold">Duur</Label>
							<Input
								class="m-0 w-full"
								id="duration"
								bind:value={formState.duration}
								oninput={(e) => {
									formState.duration = formatDuration(
										formState.duration,
										(e as any).inputType?.includes('delete')
									);
								}}
							/>
						</div>
						<div>
							<Label for="price" class="text-md font-semibold">Prijs</Label>
							<div class="relative">
								<Input
									id="price"
									class="peer ps-6 pe-12"
									placeholder="0.00"
									bind:value={formState.price}
									oninput={() => (formState.price = formatPrice(formState.price))}
								/>
								<span
									class="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-sm"
									>€</span
								>
							</div>
						</div>
					{/if}
				</div>
			</ScrollArea>
		</div>
		<Sheet.Footer>
			<Button disabled={formState.isSaving} onclick={handleSave}>
				{formState.editingId ? 'Bijwerken' : 'Dienst toevoegen'}
			</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

<style>
	.active {
		color: hsl(var(--foreground));
	}
	.active::before {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 1px;
		background-color: hsl(var(--secondary));
	}
	:global(#dnd-action-dragged-el),
	:global(#dnd-action-dragged-el *) {
		border: none;
		outline: none;
	}
</style>
