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
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import { SlidersHorizontal } from 'lucide-svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { trpc, trpcQuery } from '$lib/trpc';
	import { DateTime } from 'luxon';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { keepPreviousData } from '@tanstack/svelte-query';
	import { Debounced } from 'runed';
	let { data } = $props();

	let activeBranch = $state(data.branchesState.getActiveBranch());
	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	let pageSize: number = $state(10);
	let pageSizeStr: string = $state('10');
	let currentPage: number = $state(
		page.url.searchParams.get('page') ? parseInt(page.url.searchParams.get('page')!) - 1 : 0
	);
	let showPageInput: number = $state(-1); // Track which dot index is showing input
	let pageInputValue: string = $state('');
	let searchValue: string = $state(page.url.searchParams.get('search') || '');
	let searchDebounced = new Debounced(() => searchValue, 300);
	let prevData: any = $state(null);

	let customersQuery = $derived(
		trpcQuery.v2.authenticated.customers.getCustomers.createQuery(
			{
				organizationId: activeBranch?.id || data.session.session.activeOrganizationId,
				skip: currentPage * pageSize || 0,
				take: pageSize || 10,
				search: searchDebounced.current.trim() || undefined
			},
			{
				queryKey: ['customers', currentPage, pageSize, searchDebounced.current],
				placeholderData: () => {
					return keepPreviousData(prevData);
				}
			}
		)
	);
	let customers = $derived(customersQuery.data?.customers || []);
	let totalCount: number = $derived(customersQuery.data?.totalCount || 0);

	const columns: ColumnDef<(typeof customers)[0]>[] = [
		{
			accessorKey: 'name',
			header: 'Naam',
			enableGlobalFilter: true,
			cell: ({ row }) => {
				const nameSnippet = createRawSnippet<[string]>((getName) => {
					const name = getName();
					return {
						render: () => `<div class="capitalize">${name}</div>`
					};
				});
				return renderSnippet(nameSnippet, row.getValue('name'));
			}
		},
		{
			accessorKey: 'email',
			header: 'E-mail',
			enableGlobalFilter: true,
			cell: ({ row }) => {
				const emailSnippet = createRawSnippet<[string]>((getEmail) => {
					const email = getEmail();
					return {
						render: () => `<div class="lowercase">${email}</div>`
					};
				});
				return renderSnippet(emailSnippet, row.getValue('email'));
			}
		},
		{
			accessorKey: 'bookingCount',
			header: 'Aantal boekingen',
			enableGlobalFilter: false,
			cell: ({ row }) => {
				const bookingCountSnippet = createRawSnippet<[number]>((getBookingCount) => {
					const bookingCount = getBookingCount();
					return {
						render: () => `<div class="text-left font-medium">${bookingCount}</div>`
					};
				});
				return renderSnippet(bookingCountSnippet, row.getValue('bookingCount'));
			}
		},
		{
			accessorKey: 'lastBooking',
			header: 'Laatste boeking',
			enableGlobalFilter: false,
			cell: ({ row }) => {
				const lastBookingSnippet = createRawSnippet<[string]>((getLastBooking) => {
					const lastBooking = getLastBooking();
					return {
						render: () =>
							`<div class="font-medium">${
								lastBooking
									? DateTime.fromISO(lastBooking).toLocaleString(DateTime.DATE_SHORT)
									: 'Onbekend'
							}</div>`
					};
				});
				return renderSnippet(lastBookingSnippet, row.getValue('lastBooking'));
			}
		},
		{
			id: 'actions',
			enableHiding: false,
			enableGlobalFilter: false
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
		prevData = customersQuery.data;
	});

	function updateParams() {
		const params = page.url.searchParams;
		params.set('page', (currentPage + 1).toString());
		params.set('search', searchDebounced.current);
		const url = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, '', url);
	}

	const table = createSvelteTable<(typeof customers)[0]>({
		get data() {
			return customers;
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
				return searchValue;
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
				searchValue = updater(searchValue);
			} else {
				searchValue = updater;
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
	// ...existing code...
	// Get suggested page number based on dot position
	function getSuggestedPageNumber(
		index: number,
		paginationNumbers: (number | string)[],
		currentPage: number,
		totalPages: number
	): number {
		// If it's the first dot, suggest a page between 1 and current page
		if (index === 1) {
			return Math.max(1, Math.ceil(currentPage / 2));
		}
		// If it's the last dot, suggest a page between current page and last page
		const lastDotIndex = paginationNumbers.lastIndexOf('...');
		if (index === lastDotIndex) {
			return Math.min(totalPages, Math.ceil((currentPage + totalPages) / 2));
		}
		// Default to middle page
		return Math.ceil(totalPages / 2);
	}
	function handlePageInput() {
		const pageNum = parseInt(pageInputValue);
		const totalPages = Math.ceil(totalCount / pageSize);

		if (pageNum >= 1 && pageNum <= totalPages) {
			const newPageIndex = pageNum - 1;
			// Only update and refetch if the page is actually different
			if (newPageIndex !== currentPage) {
				currentPage = newPageIndex;
				pagination = { pageIndex: currentPage, pageSize };
			}
		}

		showPageInput = -1;
		pageInputValue = '';
	}

	// Handle escape key to cancel page input
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showPageInput = -1;
			pageInputValue = '';
		} else if (event.key === 'Enter') {
			handlePageInput();
		}
	}

	// Handle input blur (unfocus)
	function handleInputBlur() {
		showPageInput = -1;
		pageInputValue = '';
	}

	// Generate pagination numbers with dots - always 7 slots
	function generatePaginationNumbers(currentPage: number, totalPages: number): (number | string)[] {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages: (number | string)[] = [];

		if (currentPage <= 4) {
			// Show 1, 2, 3, 4, 5, ..., last
			pages.push(1, 2, 3, 4, 5, '...', totalPages);
		} else if (currentPage >= totalPages - 3) {
			// Show 1, ..., last-4, last-3, last-2, last-1, last
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
			// Show 1, ..., current-1, current, current+1, ..., last
			pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
		}

		return pages;
	}
</script>

<h1 class="mt-5 mb-6 text-3xl font-semibold">Klanten</h1>
<div class="w-full">
	<div class="flex items-center pb-4">
		<Input placeholder="Filter naam of e-mail..." bind:value={searchValue} class="max-w-sm" />
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
		{#if (customersQuery.isPlaceholderData || customersQuery.isLoading) && searchDebounced.current == ''}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="[&:has([role=checkbox])]:pl-3">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="[&:has([role=checkbox])]:pl-3">
							<Skeleton class="h-4 w-20" />
						</Table.Head>
						<Table.Head class="[&:has([role=checkbox])]:pl-3">
							<Skeleton class="h-4 w-24" />
						</Table.Head>
						<Table.Head class="[&:has([role=checkbox])]:pl-3">
							<Skeleton class="h-4 w-24" />
						</Table.Head>
						<Table.Head class="[&:has([role=checkbox])]:pl-3">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Array(pageSize) as _, i}
						<Table.Row class="h-13.25">
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-32" />
							</Table.Cell>
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-48" />
							</Table.Cell>
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-24" />
							</Table.Cell>
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-24" />
							</Table.Cell>
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<Skeleton class="h-4 w-16" />
							</Table.Cell>
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
						<Table.Row
							data-state={row.getIsSelected() && 'selected'}
							class="cursor-pointer"
							onclick={() => {
								goto(`/customers/${row.original.id}`);
							}}
							aria-label="Bekijk klant"
							tabindex={0}
							role="button"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									goto(`/customers/${row.original.id}`);
								}
							}}
						>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="[&:has([role=checkbox])]:pl-3">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="h-24 text-center"
								>Geen resultaten.</Table.Cell
							>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</div>
	<div class="flex items-center justify-between space-x-2 pt-4">
		<div class="text-muted-foreground flex-1 text-sm">
			{#if totalCount > 0}
				Pagina {currentPage + 1} van {Math.ceil(totalCount / pageSize)} - Totaal: {totalCount} klanten
			{:else}
				Geen klanten gevonden
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
								// Only update and refetch if the page is actually different
								if (newPageIndex !== currentPage) {
									currentPage = newPageIndex;
									pagination = { pageIndex: currentPage, pageSize };
								}
								data.queryClient.prefetchQuery({
									queryKey: ['customers', newPageIndex + 1, pageSize, searchDebounced.current],
									queryFn: () =>
										trpc.v2.authenticated.customers.getCustomers.query({
											organizationId:
												activeBranch?.id || data.session.session.activeOrganizationId || '',
											skip: ((pageNum as number) - 1) * pageSize,
											take: pageSize,
											search: searchDebounced.current.trim() || undefined
										}),
									staleTime: 1000 * 60 * 5 // 5 minutes
								});
								data.queryClient.prefetchQuery({
									queryKey: ['customers', newPageIndex - 1, pageSize, searchDebounced.current],
									queryFn: () =>
										trpc.v2.authenticated.customers.getCustomers.query({
											organizationId:
												activeBranch?.id || data.session.session.activeOrganizationId || '',
											skip: ((pageNum as number) - 1) * pageSize,
											take: pageSize,
											search: searchDebounced.current.trim() || undefined
										}),
									staleTime: 1000 * 60 * 5 // 5 minutes
								});
							}}
							onmouseenter={() => {
								const newPageIndex = (pageNum as number) - 1;
								data.queryClient.prefetchQuery({
									queryKey: ['customers', newPageIndex, pageSize, searchDebounced.current],
									queryFn: () =>
										trpc.v2.authenticated.customers.getCustomers.query({
											organizationId:
												activeBranch?.id || data.session.session.activeOrganizationId || '',
											skip: ((pageNum as number) - 1) * pageSize,
											take: pageSize,
											search: searchDebounced.current.trim() || undefined
										}),
									staleTime: 1000 * 60 * 5 // 5 minutes
								});
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
