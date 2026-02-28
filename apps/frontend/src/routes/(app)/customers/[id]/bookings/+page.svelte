<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getFilteredRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import { createRawSnippet, onMount } from 'svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		FlexRender,
		createSvelteTable,
		renderSnippet,
		renderComponent
	} from '$lib/components/ui/data-table/index.js';
	import { SlidersHorizontal, Calendar, User, Package2 } from 'lucide-svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { trpc, trpcQuery } from '$lib/trpc';
	import { DateTime } from 'luxon';
	import { page } from '$app/state';
	import { keepPreviousData } from '@tanstack/svelte-query';
	import { cn } from '$lib/utils';
	import BookingsAction from '$lib/components/BookingsAction.svelte';

	let { data } = $props();

	let activeBranch = $state(data.branchesState.getActiveBranch());
	const customerId = $derived(page.params.id);

	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	let pageSize: number = $state(10);
	let pageSizeStr: string = $state('10');
	let currentPage: number = $state(
		page.url.searchParams.get('page') ? parseInt(page.url.searchParams.get('page')!) - 1 : 0
	);
	let showPageInput: number = $state(-1);
	let pageInputValue: string = $state('');
	let searchQuery: string = $state(page.url.searchParams.get('search') || '');
	let searchInputValue: string = $state(page.url.searchParams.get('search') || '');
	let searchPollInterval: ReturnType<typeof setInterval> | null = null;
	let lastSearchInputValue: string = '';
	let prevData: any = $state(null);

	let bookingsQuery = $derived(
		trpcQuery.v1.authenticated.customers.getCustomerBookings.createQuery(
			{
				customerId: customerId ?? '',
				organizationId: activeBranch?.id || data.session.session.activeOrganizationId,
				skip: currentPage * pageSize || 0,
				take: pageSize || 10,
				search: searchQuery.trim() || undefined
			},
			{
				queryKey: ['customerBookings', customerId, currentPage, pageSize, searchQuery],
				placeholderData: () => {
					return keepPreviousData(prevData);
				},
				enabled: !!customerId && !!activeBranch?.id
			}
		)
	);

	let bookings = $derived(bookingsQuery.data?.bookings || []);
	let totalCount: number = $derived(bookingsQuery.data?.totalCount || 0);

	// Calculate totals
	let totalBookings = $derived(totalCount);
	let totalAmount = $derived(
		bookings.reduce(
			(sum: number, booking: { service: { price: number } }) => sum + booking.service.price,
			0
		)
	);

	const columns: ColumnDef<(typeof bookings)[0]>[] = [
		{
			accessorKey: 'id',
			header: 'Booking ID',
			enableGlobalFilter: true,
			cell: ({ row }) => {
				const idSnippet = createRawSnippet<[string]>((getId) => {
					const id = getId();
					const shortId = id.slice(-8); // Show last 8 characters of the ID
					return {
						render: () => `<div class="font-mono text-sm">#${shortId}</div>`
					};
				});
				return renderSnippet(idSnippet, row.getValue('id'));
			}
		},
		{
			accessorKey: 'createdAt',
			header: 'Datum',
			enableGlobalFilter: false,
			cell: ({ row }) => {
				const dateSnippet = createRawSnippet<[string]>((getDate) => {
					const date = new Date(getDate());
					const formattedDate = DateTime.fromISO(date.toISOString(), {
						zone: activeBranch?.timeZone || 'UTC'
					}).toLocaleString({
						day: 'numeric',
						month: 'short',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					});
					return {
						render: () => `<div class="text-sm">${formattedDate}</div>`
					};
				});
				return renderSnippet(dateSnippet, row.getValue('createdAt'));
			}
		},
		{
			accessorKey: 'service',
			header: 'Service',
			enableGlobalFilter: true,
			cell: ({ row }) => {
				const serviceSnippet = createRawSnippet<[any]>((getService) => {
					const service = getService();
					return {
						render: () => `<div class="font-medium">${service.name}</div>`
					};
				});
				return renderSnippet(serviceSnippet, row.getValue('service'));
			}
		},
		{
			accessorKey: 'employee',
			header: 'Medewerker',
			enableGlobalFilter: true,
			cell: ({ row }) => {
				const employeeSnippet = createRawSnippet<[any]>((getEmployee) => {
					const employee = getEmployee();
					return {
						render: () => `<div class="text-sm">${employee?.name || 'Niet toegewezen'}</div>`
					};
				});
				return renderSnippet(employeeSnippet, row.getValue('employee'));
			}
		},
		{
			accessorKey: 'status',
			header: 'Status',
			enableGlobalFilter: false,
			cell: ({ row }) => {
				const statusSnippet = createRawSnippet<[string]>((getStatus) => {
					const status = getStatus();
					const getStatusLabel = (status: string) => {
						switch (status) {
							case 'PENDING':
								return 'In afwachting';
							case 'CONFIRMED':
								return 'Bevestigd';
							case 'CANCELLED':
								return 'Geannuleerd';
							case 'COMPLETED':
								return 'Voltooid';
							default:
								return status;
						}
					};
					const getStatusVariant = (status: string) => {
						switch (status) {
							case 'PENDING':
								return 'outline';
							case 'CONFIRMED':
								return 'secondary';
							case 'CANCELLED':
								return 'destructive';
							case 'COMPLETED':
								return 'default';
							default:
								return 'outline';
						}
					};
					return {
						render: () => `
							<span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
								status === 'PENDING'
									? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
									: status === 'CONFIRMED'
										? 'bg-blue-50 text-blue-800 ring-blue-600/20'
										: status === 'CANCELLED'
											? 'bg-red-50 text-red-800 ring-red-600/20'
											: status === 'COMPLETED'
												? 'bg-green-50 text-green-800 ring-green-600/20'
												: 'bg-gray-50 text-gray-800 ring-gray-600/20'
							}">
								${getStatusLabel(status)}
							</span>
						`
					};
				});
				return renderSnippet(statusSnippet, row.getValue('status'));
			}
		},
		{
			accessorKey: 'service.price',
			header: 'Bedrag',
			enableGlobalFilter: false,
			cell: ({ row }) => {
				const priceSnippet = createRawSnippet<[any]>((getService) => {
					const service = getService();
					return {
						render: () =>
							`<div class="font-medium">€ ${service.price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</div>`
					};
				});
				return renderSnippet(priceSnippet, row.getValue('service'));
			}
		},
		{
			id: 'actions',
			header: '',
			enableGlobalFilter: false,
			enableSorting: false,
			cell: ({ row }) => {
				return renderComponent(BookingsAction, {
					id: row.original.id,
					customerId: customerId ?? '',
					status: row.original.status,
					onDelete: () => {
						// TODO: Implement delete functionality
						console.log('Delete booking:', row.original.id);
					}
				});
			}
		}
	];

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});

	// Update pagination when pageSize changes
	$effect(() => {
		pagination.pageSize = pageSize;
		pagination.pageIndex = currentPage;
		pageSize = parseInt(pageSizeStr);
	});

	$effect.pre(() => {
		prevData = bookingsQuery.data;
	});

	// Sync state with URL params
	onMount(() => {
		// Poll for search input changes every 350ms
		searchPollInterval = setInterval(() => {
			if (searchInputValue !== lastSearchInputValue) {
				lastSearchInputValue = searchInputValue;
				searchQuery = searchInputValue;
				currentPage = 0;
				pagination = { pageIndex: 0, pageSize };
				updateParams();
			}
		}, 350);
		return () => {
			if (searchPollInterval) clearInterval(searchPollInterval);
		};
	});

	function updateParams() {
		const params = page.url.searchParams;
		params.set('page', (currentPage + 1).toString());
		params.set('search', searchQuery);
		const url = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, '', url);
	}

	const table = createSvelteTable<(typeof bookings)[0]>({
		get data() {
			return bookings;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return searchInputValue;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		manualPagination: true,
		get pageCount() {
			return Math.ceil(totalCount / pageSize);
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
			currentPage = pagination.pageIndex;
			pageSize = pagination.pageSize;
			updateParams();
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onGlobalFilterChange: (updater) => {
			if (typeof updater === 'function') {
				searchInputValue = updater(searchInputValue);
			} else {
				searchInputValue = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		}
	});

	// Pagination helper functions (copied from customers page)
	function getSuggestedPageNumber(
		index: number,
		paginationNumbers: (number | string)[],
		currentPage: number,
		totalPages: number
	): number {
		if (index === 1) {
			return Math.max(1, Math.ceil(currentPage / 2));
		}
		const lastDotIndex = paginationNumbers.lastIndexOf('...');
		if (index === lastDotIndex) {
			return Math.min(totalPages, Math.ceil((currentPage + totalPages) / 2));
		}
		return Math.ceil(totalPages / 2);
	}

	function handlePageInput() {
		const pageNum = parseInt(pageInputValue);
		const totalPages = Math.ceil(totalCount / pageSize);

		if (pageNum >= 1 && pageNum <= totalPages) {
			const newPageIndex = pageNum - 1;
			if (newPageIndex !== currentPage) {
				currentPage = newPageIndex;
				pagination = { pageIndex: currentPage, pageSize };
			}
		}

		showPageInput = -1;
		pageInputValue = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showPageInput = -1;
			pageInputValue = '';
		} else if (event.key === 'Enter') {
			handlePageInput();
		}
	}

	function handleInputBlur() {
		showPageInput = -1;
		pageInputValue = '';
	}

	function generatePaginationNumbers(currentPage: number, totalPages: number): (number | string)[] {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages: (number | string)[] = [];

		if (currentPage <= 4) {
			pages.push(1, 2, 3, 4, 5, '...', totalPages);
		} else if (currentPage >= totalPages - 3) {
			pages.push(
				1,
				'...',
				totalPages - 4,
				totalPages - 3,
				totalPages - 2,
				totalPages - 1,
				totalPages
			);
		} else {
			pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
		}

		return pages;
	}
</script>

<h1 class="mb-6 text-3xl font-semibold">Boekingen</h1>

<!-- Summary Cards -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div class="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
		<div class="flex items-center">
			<div class="flex-1">
				{#if bookingsQuery.isLoading}
					<Skeleton class="h-8 w-16" />
					<Skeleton class="mt-1 h-4 w-24" />
				{:else}
					<div class="text-2xl font-semibold text-gray-800 dark:text-gray-200">
						{totalBookings}
					</div>
					<div class="text-muted-foreground text-sm">Totaal boekingen</div>
				{/if}
			</div>
		</div>
	</div>
	<div
		class="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-sm dark:from-emerald-900/30 dark:to-green-900/20"
	>
		<div class="flex items-center">
			<div class="flex-1">
				{#if bookingsQuery.isLoading}
					<Skeleton class="h-8 w-20" />
					<Skeleton class="mt-1 h-4 w-28" />
				{:else}
					<div class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
						€{totalAmount.toLocaleString('nl-NL')}
					</div>
					<div class="text-sm text-emerald-600/80 dark:text-emerald-400/80">Totale waarde</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<div class="w-full">
	<div class="flex items-center gap-4 pb-4">
		<Input
			placeholder="Zoek naar service, medewerker of notities..."
			bind:value={searchInputValue}
			class="w-full"
		/>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="ml-auto">
						<SlidersHorizontal class="mr-2 size-4" />
						Filter
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				{#each table.getAllColumns().filter((col) => col.getCanHide()) as column}
					<DropdownMenu.CheckboxItem
						class="capitalize"
						bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
					>
						{column.id}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<div class="rounded-md">
		{#if (bookingsQuery.isPlaceholderData || bookingsQuery.isLoading) && searchQuery == ''}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						{#each Array(7) as _}
							<Table.Head class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-20" />
							</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Array(pageSize) as _, i}
						<Table.Row class="h-13.25">
							{#each Array(7) as _}
								<Table.Cell class="[&:has([role=checkbox])]:pl-3">
									<Skeleton class="h-4 w-24" />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
						<Table.Row>
							{#each headerGroup.headers as header (header.id)}
								<Table.Head class="[&:has([role=checkbox])]:pl-3">
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</Table.Head>
							{/each}
						</Table.Row>
					{/each}
				</Table.Header>
				<Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row data-state={row.getIsSelected() && 'selected'}>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="[&:has([role=checkbox])]:pl-3">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="h-24 text-center">Geen boekingen gevonden.</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between space-x-2 pt-4">
		<div class="text-muted-foreground flex-1 text-sm">
			{#if totalCount > 0}
				Pagina {currentPage + 1} van {Math.ceil(totalCount / pageSize)} - Totaal: {totalCount} boekingen
			{:else}
				Geen boekingen gevonden
			{/if}
		</div>

		<div class="ml-4 flex items-center space-x-2">
			<span class="text-sm font-medium">Rijen per pagina:</span>
			<Select.Root
				type="single"
				bind:value={pageSizeStr}
				onValueChange={() => {
					pageSize = parseInt(pageSizeStr);
					currentPage = 0;
					pagination = { pageIndex: 0, pageSize };
				}}
			>
				<Select.Trigger class="w-20">
					<span>{pageSizeStr}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="10">10</Select.Item>
					<Select.Item value="20">20</Select.Item>
					<Select.Item value="50">50</Select.Item>
					<Select.Item value="100">100</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		{#if totalCount > 0 && Math.ceil(totalCount / pageSize) > 1}
			<div class="flex items-center space-x-2">
				{#each generatePaginationNumbers(currentPage + 1, Math.ceil(totalCount / pageSize)) as pageNum, index}
					{#if pageNum === '...'}
						{#if showPageInput === index}
							<Input
								bind:value={pageInputValue}
								onkeydown={handleKeydown}
								onblur={handleInputBlur}
								placeholder="Ga naar"
								class="h-8 w-16 text-center text-sm"
								type="number"
								min="1"
								max={Math.ceil(totalCount / pageSize)}
								autofocus
							/>
						{:else}
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									showPageInput = index;
									const paginationNumbers = generatePaginationNumbers(
										currentPage + 1,
										Math.ceil(totalCount / pageSize)
									);
									const suggestedPage = getSuggestedPageNumber(
										index,
										paginationNumbers,
										currentPage + 1,
										Math.ceil(totalCount / pageSize)
									);
									pageInputValue = suggestedPage.toString();
								}}
								class="min-w-12"
							>
								...
							</Button>
						{/if}
					{:else}
						<Button
							variant={currentPage + 1 === pageNum ? 'default' : 'outline'}
							size="sm"
							onclick={() => {
								const newPageIndex = (pageNum as number) - 1;
								if (newPageIndex !== currentPage) {
									currentPage = newPageIndex;
									pagination = { pageIndex: currentPage, pageSize };
								}
							}}
							class="min-w-12"
						>
							{pageNum}
						</Button>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
