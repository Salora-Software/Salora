<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index';

	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Image, LoaderCircle, Plus } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { SettingsInput } from './ui/settings-input';
	import type { BranchesState, BranchesType, SessionUserType } from '$lib/runes.svelte';
	import { createRawSnippet, onMount, tick } from 'svelte';
	import { trpc, trpcQuery, type RouterOutput } from '$lib/trpc';
	import { toast } from 'svelte-sonner';
	import { type ColumnDef, getCoreRowModel } from '@tanstack/table-core';

	import { type DndEvent } from 'svelte-dnd-action';
	import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import {
		createSvelteTable,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import ProductsAction from './Products-action.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from './ui/select';
	import { Badge } from './ui/badge';
	import ProductsGrabber from './Products-grabber.svelte';
	import { flip } from 'svelte/animate';
	import type { QueryClient } from '@tanstack/svelte-query';
	let value = $state('services');

	let {
		data
	}: {
		variant?: 'card' | 'no-card';
		class?: string | undefined;
		data: {
			session: SessionUserType;
			branches: BranchesType;
			branchesState: BranchesState;
			queryClient: QueryClient;
		};
	} = $props();
	let activeBranch = $state(data.branchesState.getActiveBranch());
	data.branchesState.onBranchChange((branch) => {
		if (branch) {
			activeBranch = branch;
		}
	});

	const queryClient = data.queryClient;

	let servicesQuery = $derived(
		trpcQuery.v1.authenticated.services.getServices.createQuery(
			{
				organizationId: activeBranch?.id || data.session?.session?.activeOrganizationId
			},
			{
				queryKey: ['getServices', activeBranch?.id || '']
			}
		)
	);
	const deleteService = trpcQuery.v1.authenticated.services.deleteService.createMutation({
		mutationKey: ['deleteService'],
		onMutate: ({ serviceId }) => {
			//cancel all queries
			queryClient.cancelQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
			const previousServices = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getServices']
			>(['getServices', activeBranch?.id || '']);
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter((service) => service.id !== serviceId);
			});
			return { previousServices };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], context?.previousServices);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
		}
	});
	const createService = trpcQuery.v1.authenticated.services.createService.createMutation({
		mutationKey: ['createService'],
		onMutate: async (newService) => {
			//cancel all queries
			await queryClient.cancelQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
			const previousServices = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getServices']
			>(['getServices', activeBranch?.id || '']);
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return [...old, { ...newService, id: '' }];
			});
			return { previousServices };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], context?.previousServices);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
		}
	});
	const updateService = trpcQuery.v1.authenticated.services.updateService.createMutation({
		mutationKey: ['updateService'],
		onMutate: async (updatedService) => {
			//cancel all queries
			await queryClient.cancelQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
			const previousServices = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getServices']
			>(['getServices', activeBranch?.id || '']);
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.map((service) =>
					service.id === updatedService.serviceId ? { ...service, ...updatedService } : service
				);
			});
			return { previousServices };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getServices', activeBranch?.id || ''], context?.previousServices);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getServices', activeBranch?.id || '']
			});
		}
	});

	let services = $derived(
		servicesQuery.data?.sort((a, b) => a.sortingIndex - b.sortingIndex) || []
	);
	let packagesQuery = $derived(
		trpcQuery.v1.authenticated.services.getPackages.createQuery(
			{
				organizationId: activeBranch?.id || data.session?.session?.activeOrganizationId
			},
			{
				queryKey: ['getPackages', activeBranch?.id || '']
			}
		)
	);
	const deletePackage = trpcQuery.v1.authenticated.services.deletePackage.createMutation({
		mutationKey: ['deletePackage'],
		onMutate: ({ packageId }) => {
			//cancel all queries
			queryClient.cancelQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
			const previousPackages = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getPackages']
			>(['getPackages', activeBranch?.id || '']);
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter((pkg) => pkg.id !== packageId);
			});
			return { previousPackages };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], context?.previousPackages);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
		}
	});
	const createPackage = trpcQuery.v1.authenticated.services.createPackage.createMutation({
		mutationKey: ['createPackage'],
		onMutate: async (newPackage) => {
			//cancel all queries
			await queryClient.cancelQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
			const previousPackages = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getPackages']
			>(['getPackages', activeBranch?.id || '']);
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return [...old, { ...newPackage, id: '' }];
			});
			return { previousPackages };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], context?.previousPackages);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
		}
	});
	const updatePackage = trpcQuery.v1.authenticated.services.updatePackage.createMutation({
		mutationKey: ['updatePackage'],
		onMutate: async (updatedPackage) => {
			//cancel all queries
			await queryClient.cancelQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
			const previousPackages = queryClient.getQueryData<
				RouterOutput['v1']['authenticated']['services']['getPackages']
			>(['getPackages', activeBranch?.id || '']);
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.map((pkg) =>
					pkg.id === updatedPackage.packageId ? { ...pkg, ...updatedPackage } : pkg
				);
			});
			return { previousPackages };
		},
		onError: (err, variables, context: any) => {
			queryClient.setQueryData(['getPackages', activeBranch?.id || ''], context?.previousPackages);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getPackages', activeBranch?.id || '']
			});
		}
	});
	let packages = $derived(
		packagesQuery.data?.sort((a, b) => a.sortingIndex - b.sortingIndex) || []
	);

	const columns: ColumnDef<
		RouterOutput['v1']['authenticated']['services']['getServices'][number]
	>[] = [
		{
			accessorKey: 'drag',
			header: 'Orde',
			cell: ({ cell }) => {
				return renderComponent(ProductsGrabber, {
					size: '18px',
					class: 'text-muted-foreground '
				});
			},
			enableResizing: false
		},
		{
			accessorKey: 'name',
			header: 'Dienst'
		},
		{
			accessorKey: 'price',
			header: 'Prijs',
			cell: ({ row }) => {
				const formatter = new Intl.NumberFormat('nl-NL', {
					style: 'currency',
					currency: 'EUR'
				});

				const amountCellSnippet = createRawSnippet<[string]>((getAmount) => {
					const amount = getAmount();
					return {
						render: () => `${amount}`
					};
				});

				return renderSnippet(
					amountCellSnippet,
					formatter.format(parseFloat(row.getValue('price')))
				);
			}
		},
		{
			accessorKey: 'duration',
			header: 'Duur',
			cell: ({ row }) => {
				const formatter = new Intl.NumberFormat('nl-NL', {
					style: 'unit',
					unit: 'minute'
				});

				const amountCellSnippet = createRawSnippet<[string]>((getAmount) => {
					const amount = getAmount();
					return {
						render: () => `${amount}`
					};
				});

				return renderSnippet(
					amountCellSnippet,
					formatter.format(parseFloat(row.getValue('duration')))
				);
			}
		},
		{
			accessorKey: 'id',
			header: 'ID'
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				return renderComponent(ProductsAction, {
					id: row.original.id,
					name: row.original.name,
					price: row.original.price,
					duration: row.original.duration,
					branchesState: data.branchesState,
					values,
					type: 'service'
				});
			}
		}
	];

	const packageColumns: ColumnDef<(typeof packages)[number]>[] = [
		{
			accessorKey: 'drag',
			header: 'Orde',
			cell: ({ cell }) => {
				return renderComponent(ProductsGrabber, {
					size: '18px',
					class: 'text-muted-foreground '
				});
			},
			enableResizing: false
		},
		{
			accessorKey: 'name',
			header: 'Pakket'
		},
		{
			accessorKey: 'price',
			header: 'Prijs',
			cell: ({ row }) => {
				const formatter = new Intl.NumberFormat('nl-NL', {
					style: 'currency',
					currency: 'EUR'
				});

				const amountCellSnippet = createRawSnippet<[string]>((getAmount) => {
					const amount = getAmount();
					return {
						render: () => `${amount}`
					};
				});

				return renderSnippet(
					amountCellSnippet,
					formatter.format(parseFloat(row.getValue('price')))
				);
			}
		},
		{
			accessorKey: 'services',
			header: 'Diensten',
			cell: ({ row }) => {
				const servicesCellSnippet = createRawSnippet<[string]>((getServices) => {
					const services = getServices();
					return {
						render: () => `${services}`
					};
				});

				return renderSnippet(
					servicesCellSnippet,
					row.original.services.map((s) => s.name).join(', ')
				);
			}
		},
		{
			accessorKey: 'id',
			header: 'ID'
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				return renderComponent(ProductsAction, {
					id: row.original.id,
					name: row.original.name,
					price: row.original.price,
					branchesState: data.branchesState,
					values,
					type: 'package'
				});
			}
		}
	];
	let table = $state(
		createSvelteTable({
			// svelte-ignore state_referenced_locally
			data: services,
			columns,
			getCoreRowModel: getCoreRowModel()
		})
	);

	let packageTable = $state(
		createSvelteTable({
			// svelte-ignore state_referenced_locally
			data: packages,
			columns: packageColumns,
			getCoreRowModel: getCoreRowModel()
		})
	);

	$effect(() => {
		table = createSvelteTable({
			data: services,
			columns,
			getCoreRowModel: getCoreRowModel()
		});
	});

	$effect(() => {
		packageTable = createSvelteTable({
			data: packages,
			columns: packageColumns,
			getCoreRowModel: getCoreRowModel()
		});
	});
	let values: {
		name: {
			value: string;
		};
		price: {
			value: string;
			formatter: (value: string) => string;
		};
		duration: {
			value: string;
			formatter: (value: string, typedValue?: string) => string;
		};
		save: {
			loading: boolean;
		};
		assignEmployees: {
			value: string[];
			open: boolean;
		};
		sheet: {
			active: boolean;
			loading: boolean;
			editing?: string;
		};
	} = $state({
		name: {
			value: ''
		},
		assignEmployees: {
			value: [],
			open: false,
			selected: []
		},
		price: {
			value: '',
			formatter: (value: string) => {
				let finalValue = value;
				// remove the . and , from the string
				finalValue = finalValue.replace(/[^0-9]/g, '');
				let number = Math.round(parseFloat(finalValue)) / 100 || 0;
				number = number < 5000 ? number : 5000;
				finalValue = number.toFixed(2);
				// add the . and .tofixed defaults to 10.00 but I want 10,00 and use the dot for each 3 numbers
				finalValue = finalValue.replace('.', ',');
				finalValue = finalValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

				return finalValue;
			}
		},
		duration: {
			value: '30 minuten',
			formatter: (value: string, typedValue?: string) => {
				//remove all the non numeric characters
				value = value.replace(/\D/g, '');
				if (typedValue?.includes('deleteContent')) {
					value = value.slice(0, -1);
				}
				// format as integer and add minuten
				return (parseInt(value) || '') + ' minuten';
			}
		},
		save: {
			loading: false
		},
		sheet: {
			active: false,
			loading: true,
			editing: undefined
		}
	});
	let flipDurationMs = 300;
	let sliderContent: {
		active?: string;
		items: {
			label: string;
		}[];
	} = $state({
		active: 'Details',
		items: [
			{
				label: 'Details'
			},
			{
				label: 'Duur & Prijs'
			}
		]
	});

	// Update slider content when value changes
	$effect(() => {
		sliderContent.items = [
			{
				label: 'Details'
			},
			{
				label: value === 'services' ? 'Duur & Prijs' : 'Prijs'
			}
		];
		// Reset to Details tab when switching tabs
		sliderContent.active = 'Details';
	});

	function handleDndConsider(e: CustomEvent<DndEvent>) {
		services = e.detail.items as RouterOutput['v1']['authenticated']['services']['getServices'];
	}
	function handleDndFinalize(e: CustomEvent<DndEvent>) {
		// update the sortingIndex of the services
		let newServices = e.detail.items.map((item, index) => {
			return {
				...item,
				sortingIndex: index
			};
		}) as RouterOutput['v1']['authenticated']['services']['getServices'];
		// update the services in the database. however, only if the sortingIndex has changed. so loop through each and check if the sortingIndex is different'
		for (let i = 0; i < newServices.length; i++) {
			if (newServices[i].sortingIndex !== services[i].sortingIndex) {
				// update the sortingIndex in the database
				updateService.mutate({
					organizationId: activeBranch?.id || '',
					serviceId: newServices[i].id,
					name: newServices[i].name,
					price: newServices[i].price,
					duration: newServices[i].duration,
					employees: newServices[i].employees.map((employee) => employee.id),
					sortingIndex: i
				});
			}
		}
		services = newServices;
	}

	function handlePackageDndConsider(e: CustomEvent<DndEvent>) {
		packages = (e.detail.items || []) as typeof packages;
	}
	function handlePackageDndFinalize(e: CustomEvent<DndEvent>) {
		// update the sortingIndex of the packages
		let newPackages = e.detail.items.map((item, index) => {
			return {
				...item,
				sortingIndex: index
			};
		}) as typeof packages;
		// Update the packages in the database
		for (let i = 0; i < newPackages.length; i++) {
			if (newPackages[i].sortingIndex !== packages[i].sortingIndex) {
				// update the sortingIndex in the database
				updateService.mutate({
					organizationId: activeBranch?.id || '',
					serviceId: newPackages[i].id || '',
					name: newPackages[i].name,
					price: newPackages[i].price,
					duration: 0, // Packages don't have a duration
					employees: [], // Packages don't have employees
					sortingIndex: i
				});
			}
		}
		packages = newPackages;
	}
	let dropTargetStyle = {
		border: 'none'
	};
</script>

<div class="flex flex-wrap items-center justify-between gap-4 py-4">
	<div class="flex items-center gap-2">
		<Tabs.Root bind:value>
			<Tabs.List>
				<Tabs.Trigger value="services">Diensten</Tabs.Trigger>
				<Tabs.Trigger value="packages">Pakketten</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	</div>
	<div class="actions">
		<Button
			variant="outline"
			class="text-sm"
			onclick={() => {
				values.sheet = {
					...values.sheet,
					active: true,
					editing: undefined
				};
				values.name.value = '';
				values.price.value = '0,00';
				values.duration.value = '30 minuten';
				values.assignEmployees.value = [];
			}}
		>
			<Plus />
			{value === 'services' ? 'Dienst toevoegen' : 'Pakket toevoegen'}
		</Button>
	</div>
</div>
<Sheet.Root
	bind:open={values.sheet.active}
	class="data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
>
	{#if value === 'services'}
		{#if services.length > 0 && !servicesQuery.isLoading}
			<div class="w-full">
				<Table.Root class="w-full">
					<Table.Header>
						{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
							<Table.Row>
								<Table.Head class="w-12.5">Orde</Table.Head>
								<Table.Head class="w-50">Dienst</Table.Head>
								<Table.Head class="">Prijs</Table.Head>
								<Table.Head class="w-30">Duur</Table.Head>
								<Table.Head class="">ID</Table.Head>
								<Table.Head class="w-12.5">Acties</Table.Head>
							</Table.Row>
						{/each}
					</Table.Header>
					<tbody
						use:dragHandleZone={{
							items: services,
							flipDurationMs,
							dropTargetStyle
						}}
						onconsider={handleDndConsider}
						onfinalize={handleDndFinalize}
						class="[&_tr:last-child]:border-0"
					>
						{#each services as row (row.id)}
							<tr
								animate:flip={{ duration: flipDurationMs }}
								onclick={() => {
									values.sheet = {
										...values.sheet,
										active: true,
										editing: row.id
									};
									values.name.value = row.name;
									values.price.value = values.price.formatter((row.price * 100).toString());
									values.duration.value = values.duration.formatter(row.duration.toString());
									values.assignEmployees.value = row.employees.map((employee) => employee.id);
								}}
							>
								<Table.Cell>
									<div
										aria-label="drag-handle for "
										use:dragHandle
										class="handle bg-secondary flex size-7 items-center justify-center rounded-md [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
									>
										<ProductsGrabber size="18px" class="text-muted-foreground " />
									</div>
								</Table.Cell>
								<Table.Cell>
									{row.name}
								</Table.Cell>
								<Table.Cell>
									{new Intl.NumberFormat('nl-NL', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									}).format(row.price)}
								</Table.Cell>
								<Table.Cell>
									{values.duration.formatter(row.duration.toString())}
								</Table.Cell>
								<Table.Cell>
									{row.id}
								</Table.Cell>
								<Table.Cell>
									<ProductsAction
										id={row.id}
										name={row.name}
										price={row.price}
										duration={row.duration}
										branchesState={data.branchesState}
										{values}
										type="service"
										onDelete={(type) => {
											if (type === 'package') {
												deletePackage.mutate({
													organizationId: activeBranch?.id || '',
													packageId: row.id
												});
											} else if (type === 'service') {
												deleteService.mutate({
													organizationId: activeBranch?.id || '',
													serviceId: row.id
												});
											}
										}}
									/>
								</Table.Cell>
							</tr>
						{:else}
							<Table.Row>
								<Table.Cell colspan={columns.length} class="h-24 text-center">
									No services.
								</Table.Cell>
							</Table.Row>
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
				{:else if services.length == 0}
					<div class="flex h-full w-full items-center justify-center">
						<div class="flex flex-col items-center gap-1 text-center">
							<h3 class="text-2xl font-bold tracking-tight">Je hebt geen diensten</h3>
							<p class="text-muted-foreground mb-5 text-sm">
								Voeg diensten toe om ze te verkopen aan je klanten.
							</p>
							<Sheet.Trigger class={buttonVariants()}>
								<Plus />
								Dienst toevoegen
							</Sheet.Trigger>
						</div>
					</div>
				{/if}
			</Card.Content>
		{/if}
	{:else if value === 'packages'}
		{#if packages.length > 0}
			<div class="w-full">
				<Table.Root class="w-full">
					<Table.Header>
						{#each packageTable.getHeaderGroups() as headerGroup (headerGroup.id)}
							<Table.Row>
								<Table.Head class="w-12.5">Orde</Table.Head>
								<Table.Head class="w-50">Pakket</Table.Head>
								<Table.Head class="">Prijs</Table.Head>
								<Table.Head class="">Diensten</Table.Head>
								<Table.Head class="">ID</Table.Head>
								<Table.Head class="w-12.5">Acties</Table.Head>
							</Table.Row>
						{/each}
					</Table.Header>
					<tbody
						use:dragHandleZone={{
							items: packages,
							flipDurationMs,
							dropTargetStyle
						}}
						onconsider={handlePackageDndConsider}
						onfinalize={handlePackageDndFinalize}
						class="[&_tr:last-child]:border-0"
					>
						{#each packages as row (row.id)}
							<tr
								animate:flip={{ duration: flipDurationMs }}
								onclick={() => {
									values.sheet = {
										...values.sheet,
										active: true,
										editing: row.id
									};
									values.name.value = row.name;
									values.price.value = values.price.formatter((row.price * 100).toString());
									values.assignEmployees.value = row.services.map((service) => service.id);
								}}
							>
								<Table.Cell>
									<div
										aria-label="drag-handle for "
										use:dragHandle
										class="handle bg-secondary flex size-7 items-center justify-center rounded-md [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
									>
										<ProductsGrabber size="18px" class="text-muted-foreground " />
									</div>
								</Table.Cell>
								<Table.Cell>
									{row.name}
								</Table.Cell>
								<Table.Cell>
									{new Intl.NumberFormat('nl-NL', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									}).format(row.price)}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-wrap gap-1">
										{#each row.services as service}
											<Badge variant="outline" class="text-xs">
												{service.name}
											</Badge>
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell>
									{row.id}
								</Table.Cell>
								<Table.Cell>
									<ProductsAction
										id={row.id}
										name={row.name}
										price={row.price}
										branchesState={data.branchesState}
										{values}
										type="package"
										onDelete={(type) => {
											if (type === 'package') {
												deletePackage.mutate({
													organizationId: activeBranch?.id || '',
													packageId: row.id
												});
											} else if (type === 'service') {
												deleteService.mutate({
													organizationId: activeBranch?.id || '',
													serviceId: row.id
												});
											}
										}}
									/>
								</Table.Cell>
							</tr>
						{:else}
							<Table.Row>
								<Table.Cell colspan={packageColumns.length} class="h-24 text-center">
									Geen pakketten.
								</Table.Cell>
							</Table.Row>
						{/each}
					</tbody>
				</Table.Root>
			</div>
		{:else}
			<Card.Content class="w-full">
				<div class="flex h-full w-full items-center justify-center">
					<div class="flex flex-col items-center gap-1 text-center">
						<h3 class="text-2xl font-bold tracking-tight">Je hebt geen pakketten</h3>
						<p class="text-muted-foreground mb-5 text-sm">
							Voeg pakketten toe om ze te verkopen aan je klanten.
						</p>
						<Sheet.Trigger class={buttonVariants()}>
							<Plus />
							Pakket toevoegen
						</Sheet.Trigger>
					</div>
				</div>
			</Card.Content>
		{/if}
	{/if}
	<Sheet.Content side="right" class="w-full max-w-full sm:w-125">
		<div>
			<Sheet.Header>
				<Sheet.Title>
					{values.sheet.editing
						? value === 'services'
							? 'Dienst bijwerken'
							: 'Pakket bijwerken'
						: value === 'services'
							? 'Dienst toevoegen'
							: 'Pakket toevoegen'}
				</Sheet.Title>
				<Sheet.Description>
					{value === 'services'
						? 'Vul de gegevens in om een nieuwe dienst toe te voegen.'
						: 'Vul de gegevens in om een nieuw pakket toe te voegen.'}
				</Sheet.Description>
			</Sheet.Header>
			<ScrollArea class="h-[calc(100vh-56px-7rem)] max-w-full rounded-md p-3">
				<!-- <TinySlider bind:this={slider}>
						{#snippet children({ sliderWidth })} -->
				{#each sliderContent.items as item, i}
					<button
						class="min-w-max-content relative mt-4 mr-4 cursor-pointer rounded-md"
						onclick={() => {
							// slider?.setIndex(i);
							sliderContent.active = item.label;
						}}
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
				<!-- {/snippet}
					</TinySlider> -->
				<Separator class="mb-4" />
				<div class="grid gap-4 py-4">
					{#if sliderContent.active === 'Details'}
						<div class="flex w-full flex-col items-center justify-center gap-4">
							<Avatar.Root class=" h-25 w-25 rounded-md ">
								<div
									class="bg-background/50 rounded-3.75 absolute flex h-full w-full cursor-pointer items-center justify-center opacity-0 transition-opacity hover:opacity-100"
								>
									<span class="text-primary-foreground">
										<Image size="40" />
									</span>
								</div>
								<Avatar.Image src="" alt="@shadcn" />
								<Avatar.Fallback>
									<img src="/images/placeholder-small.svg" alt="" />
								</Avatar.Fallback>
							</Avatar.Root>
							<h1 class="text-lg font-semibold">
								{values.name.value}
							</h1>
						</div>

						<SettingsInput
							title="Naam"
							type="input"
							class="w-full"
							required
							bind:value={values.name.value}
						/>

						{#if value === 'packages'}
							<div>
								<h3 class="text-md font-semibold">Inbegrepen diensten</h3>
								<Select.Root
									type="multiple"
									bind:value={values.assignEmployees.value}
									bind:open={values.assignEmployees.open}
								>
									<Select.Trigger class="h-auto min-h-10 w-full px-3 py-1.5">
										<div class="flex flex-wrap gap-2">
											{#if values.assignEmployees.value && values.assignEmployees.value.length > 0}
												{#each values.assignEmployees.value as option}
													<Badge
														variant="outline"
														class="flex items-center gap-1 px-2 py-0.5 text-xs font-normal"
														onmousedown={(e) => e.stopPropagation()}
														onclick={async (e) => {
															e.stopPropagation();
															await tick();
															values.assignEmployees.value = values.assignEmployees.value.filter(
																(item) => item !== option
															);
														}}
													>
														<Plus class="rotate-45" size="13" />
														<span class="max-w-32 truncate">
															{services.find((service) => service.id === option)?.name || option}
														</span>
													</Badge>
												{/each}
											{:else}
												<span class="text-muted-foreground">Selecteer diensten...</span>
											{/if}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each services as service}
											<Select.Item value={service.id}>{service.name}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}

						{#if value === 'services'}
							<div>
								<h3 class="text-md font-semibold">Aangewezen medewerkers</h3>
								<Select.Root
									type="multiple"
									bind:value={values.assignEmployees.value}
									bind:open={values.assignEmployees.open}
								>
									<Select.Trigger class="h-auto min-h-10 w-full px-3 py-1.5">
										<div class="flex flex-wrap gap-2">
											{#if values.assignEmployees.value && values.assignEmployees.value.length > 0}
												{#each values.assignEmployees.value as option}
													<Badge
														variant="outline"
														class="flex items-center gap-1 px-2 py-0.5 text-xs font-normal"
														onmousedown={(e) => e.stopPropagation()}
														onclick={async (e) => {
															e.stopPropagation();
															await tick();
															values.assignEmployees.value = values.assignEmployees.value.filter(
																(item) => item !== option
															);
														}}
													>
														<Plus class="rotate-45" size="13" />
														<span class="max-w-32 truncate">
															{data.branchesState
																.getActiveBranch()
																?.members.find((member) => member.id === option)?.user.name ||
																option}
														</span>
													</Badge>
												{/each}
											{:else}
												<span class="text-muted-foreground">Selecteer medewerkers...</span>
											{/if}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each data.branchesState
											.getActiveBranch()
											?.members.map( (member) => ({ label: member.user.name, value: member.id }) ) || [] as item}
											<Select.Item value={item.value}>{item.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
						<SettingsInput
							title="Zichtbaar"
							description="Of het product zichtbaar is voor klanten."
							type="switch"
							class="w-full"
							required
							value={() => activeBranch?.members.map((member) => member.user.name) ?? []}
						/>
					{:else if sliderContent.active === 'Duur & Prijs' || sliderContent.active === 'Prijs'}
						{#if value === 'services'}
							<div>
								<Label for="duration" required class="text-md font-semibold">Duur</Label>
								<Input
									class="m-0 w-full"
									id="duration"
									bind:value={values.duration.value}
									oninput={(e) => {
										//@ts-ignore
										const key = e.inputType;
										values.duration.value = values.duration.formatter(values.duration.value, key);
									}}
								/>
							</div>
						{/if}
						<div>
							<div class="space-y-2">
								<Label for="price" required class="text-md font-semibold">Prijs</Label>
								<div class="relative">
									<Input
										id="input-13"
										class="peer ps-6 pe-12"
										placeholder="0.00"
										type="text"
										bind:value={values.price.value}
										oninput={(e) => {
											//@ts-ignore
											const key = e.inputType;
											values.price.value = values.price.formatter(values.price.value);
										}}
									/>
									<span
										class="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-sm peer-disabled:opacity-50"
									>
										€
									</span>
									<span
										class="text-muted-foreground pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm peer-disabled:opacity-50"
									>
										EUR
									</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</ScrollArea>
		</div>
		<Sheet.Footer>
			<Button
				class={buttonVariants({})}
				disabled={values.save.loading}
				onclick={async () => {
					values.save.loading = true;
					try {
						if (value === 'services') {
							if (!activeBranch) {
								toast.error('Er is geen actieve vestiging');
								return;
							}
							if (!values.sheet.editing)
								createService.mutate({
									organizationId: activeBranch.id,
									name: values.name.value,
									price: parseFloat(values.price.value.replace(/[^0-9]/g, '')) / 100,
									duration: parseInt(values.duration.value),
									employees: values.assignEmployees.value,
									sortingIndex:
										services.length > 0 ? Math.min(...services.map((s) => s.sortingIndex)) - 1 : 0
								});
							else {
								updateService.mutate({
									organizationId: activeBranch.id,
									serviceId: values.sheet.editing || '',
									name: values.name.value,
									price: parseFloat(values.price.value.replace(/[^0-9]/g, '')) / 100,
									duration: parseInt(values.duration.value),
									employees: values.assignEmployees.value,
									sortingIndex: services.find((service) => service.id === values.sheet.editing)
										?.sortingIndex
								});
							}
						} else {
							if (!activeBranch) {
								toast.error('Er is geen actieve vestiging');
								return;
							}
							if (!values.sheet.editing) {
								// Create new package
								await createPackage.mutateAsync({
									organizationId: activeBranch.id,
									name: values.name.value,
									price: parseFloat(values.price.value.replace(/[^0-9]/g, '')) / 100,
									services: values.assignEmployees.value,
									sortingIndex:
										packages.length > 0 ? Math.min(...packages.map((p) => p.sortingIndex)) - 1 : 0
								});
							} else {
								// Update existing package
								await updatePackage.mutateAsync({
									organizationId: activeBranch.id,
									packageId: values.sheet.editing || '',
									name: values.name.value,
									price: parseFloat(values.price.value.replace(/[^0-9]/g, '')) / 100,
									services: values.assignEmployees.value,
									sortingIndex: packages.find((pkg) => pkg.id === values.sheet.editing)
										?.sortingIndex
								});
							}
						}

						values.sheet.active = false;
						// Store editing state before clearing
						const wasEditing = values.sheet.editing;
						// Clear form data after successful save
						values.name.value = '';
						values.price.value = '0,00';
						values.duration.value = '30 minuten';
						values.assignEmployees.value = [];
						values.sheet.editing = undefined;
						toast.success(
							`${value === 'services' ? 'Dienst' : 'Pakket'} is succesvol ${wasEditing ? 'bijgewerkt' : 'toegevoegd'}`
						);
					} catch {}
					values.save.loading = false;
				}}
			>
				{values.sheet.editing
					? 'Bijwerken'
					: value === 'services'
						? 'Dienst toevoegen'
						: 'Pakket toevoegen'}
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
	:global(#dnd-action-dragged-el) {
		border: none;
		outline: none;
		width: 100%;
	}
	:global(#dnd-action-dragged-el *) {
		border: none;
		outline: none;
	}
</style>
