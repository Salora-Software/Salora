<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { Separator } from '$lib/components/ui/separator';
	import CalendarCardDatePicker from '$lib/components/CalendarCard-DatePicker.svelte';
	import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-svelte';
	import { DateTime } from 'luxon';
	import { type DateValue } from '@internationalized/date';
	import { Debounced } from 'runed';
	import { trpcQuery } from '$lib/trpc';
	import { cn } from '$lib/utils';
	import type { BranchType } from '$lib/runes.svelte.js';
	import type { QueryClient } from '@tanstack/svelte-query';

	type CustomerOption = {
		id: string;
		name: string;
		email: string;
		phone: string | null;
		createdAt?: Date;
	};

	let {
		open = $bindable(false),
		branch,
		selectedDate,
		queryClient,
		onSaved
	}: {
		open: boolean;
		branch: BranchType | null;
		selectedDate?: DateValue;
		queryClient: QueryClient;
		onSaved?: () => void;
	} = $props();

	let customerSelectOpen = $state(false);
	let createCustomerOpen = $state(false);
	let createCustomerSaving = $state(false);
	let customerQuerySearch = $state('');
	let titleTouched = $state(false);
	let customerNameError = $state('');
	let customerEmailError = $state('');
	let saveError = $state('');

	const debouncedSearch = new Debounced(() => customerQuerySearch, 300);

	const timeZone = $derived(branch?.timeZone || 'UTC');
	const defaultDate = $derived(
		selectedDate
			? DateTime.fromJSDate(selectedDate.toDate(timeZone)).setZone(timeZone)
			: DateTime.now().setZone(timeZone)
	);
	const defaultStart = $derived(defaultDate.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }));
	const defaultEnd = $derived(defaultStart.plus({ minutes: 30 }));

	let title = $state('');
	let notes = $state('');
	let status = $state('PENDING');
	let serviceId = $state('');
	let memberId = $state('');
	let customerId = $state('');
	let selectedCustomer = $state<CustomerOption | null>(null);
	let startDate = $state<DateTime>(defaultStart);
	let endDate = $state<DateTime>(defaultEnd);
	let customerForm = $state({
		name: '',
		email: '',
		phone: '',
		address: ''
	});

	const services = $derived(branch?.services || []);
	const members = $derived(
		(branch?.members || []).slice().sort((a, b) => a.user.name.localeCompare(b.user.name))
	);
	const customersQuery = $derived(
		trpcQuery.v2.authenticated.customers.getCustomers.createQuery(
			{
				organizationId: branch?.id || '',
				take: 100,
				search: debouncedSearch.current || undefined
			},
			{
				queryKey: ['getCustomers', branch?.id || '', debouncedSearch.current],
				enabled: !!branch?.id && open
			}
		)
	);

	const createCustomerMutation = trpcQuery.v2.authenticated.customers.createCustomer.createMutation(
		{
			mutationKey: ['createCustomer'],
			onSuccess: async (result) => {
				selectedCustomer = result.customer;
				customerId = result.customer.id;
				customerSelectOpen = false;
				createCustomerOpen = false;
				customerForm = {
					name: '',
					email: '',
					phone: '',
					address: ''
				};
				customerNameError = '';
				customerEmailError = '';
				if (branch?.id) {
					await queryClient.invalidateQueries({
						queryKey: ['getCustomers', branch.id]
					});
				}
			}
		}
	);

	const upsertCalendarItem = trpcQuery.v2.authenticated.calendar.upsertCalendarItem.createMutation({
		mutationKey: ['createAppointment'],
		onSuccess: async () => {
			if (branch?.id) {
				await queryClient.invalidateQueries({
					queryKey: ['getCalendar', branch.id, selectedDate?.toString() || '']
				});
			}
			open = false;
			onSaved?.();
			resetForm();
		}
	});

	function resetForm() {
		title = '';
		notes = '';
		status = 'PENDING';
		serviceId = services[0]?.id || '';
		memberId = members[0]?.id || '';
		customerId = '';
		selectedCustomer = null;
		customerSelectOpen = false;
		createCustomerOpen = false;
		customerQuerySearch = '';
		titleTouched = false;
		saveError = '';
		startDate = defaultStart;
		endDate = defaultEnd;
	}

	function syncTitle() {
		if (titleTouched) return;
		const parts = [] as string[];
		if (selectedCustomer?.name) parts.push(selectedCustomer.name);
		const selectedService = services.find((service) => service.id === serviceId);
		if (selectedService?.name) parts.push(selectedService.name);
		title = parts.length > 0 ? parts.join(' - ') : 'Nieuwe afspraak';
	}

	function validateCustomerForm() {
		customerNameError = customerForm.name.trim() ? '' : 'Naam is verplicht';
		customerEmailError = customerForm.email.trim() ? '' : 'E-mail is verplicht';
		if (customerEmailError === '') {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(customerForm.email)) {
				customerEmailError = 'Ongeldig e-mailadres';
			}
		}
		return !customerNameError && !customerEmailError;
	}

	async function saveAppointment() {
		saveError = '';
		if (!branch?.id) {
			saveError = 'Geen organisatie geselecteerd';
			return;
		}
		if (!serviceId) {
			saveError = 'Selecteer een dienst';
			return;
		}
		const selectedService = services.find((service) => service.id === serviceId);
		if (!selectedService) {
			saveError = 'Selecteer een geldige dienst';
			return;
		}
		const itemTitle =
			title.trim() ||
			(selectedCustomer?.name
				? `${selectedCustomer.name} - ${selectedService.name}`
				: selectedService.name);
		await upsertCalendarItem.mutateAsync({
			type: 'BOOKING',
			organizationId: branch.id,
			title: itemTitle,
			startTime: startDate.toJSDate(),
			endTime: endDate.toJSDate(),
			notes,
			status,
			serviceId,
			memberId: memberId || undefined,
			customerId: selectedCustomer?.id
		});
	}

	function openCreateCustomerDialog() {
		customerForm = {
			name: selectedCustomer?.name || '',
			email: selectedCustomer?.email || '',
			phone: selectedCustomer?.phone || '',
			address: ''
		};
		customerNameError = '';
		customerEmailError = '';
		createCustomerOpen = true;
	}

	function selectCustomer(customer: CustomerOption) {
		selectedCustomer = customer;
		customerId = customer.id;
		customerSelectOpen = false;
		customerQuerySearch = customer.name;
		titleTouched = false;
		syncTitle();
	}

	let wasOpen = $state(false);
	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
		if (!open) {
			return;
		}
		if (!serviceId) {
			serviceId = services[0]?.id || '';
		}
		if (!memberId) {
			memberId = members[0]?.id || '';
		}
		syncTitle();
	});

	$effect(() => {
		if (!open) return;

		const selectedService = services.find((s) => s.id === serviceId);
		if (selectedService?.duration) {
			endDate = startDate.plus({ minutes: selectedService.duration });
		}
	});

	$effect(() => {
		if (!open) return;
		if (customersQuery.data?.customers && !selectedCustomer?.id) {
			const match = customersQuery.data.customers.find((customer) => customer.id === customerId);
			if (match) {
				selectedCustomer = match;
			}
		}
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="w-full sm:max-w-2xl">
		<Sheet.Header>
			<Sheet.Title>Nieuwe afspraak</Sheet.Title>
			<Sheet.Description>
				Maak een afspraak aan, kies een klant en koppel later desnoods alsnog iemand.
			</Sheet.Description>
		</Sheet.Header>

		<ScrollArea class="h-[calc(100vh-10rem)] px-3">
			<div class="space-y-6">
				<div class="space-y-3">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h3 class="text-sm font-semibold">Klant</h3>
							<p class="text-muted-foreground text-xs">
								Kies een bestaande klant of maak direct een nieuwe aan.
							</p>
						</div>
					</div>

					<Popover.Root bind:open={customerSelectOpen}>
						<Popover.Trigger class="w-full">
							<Button variant="outline" class="w-full justify-between" role="combobox">
								<span class={cn(!selectedCustomer && 'text-muted-foreground')}>
									{selectedCustomer
										? `${selectedCustomer.name} • ${selectedCustomer.email}`
										: 'Selecteer een klant'}
								</span>
								<ChevronsUpDown class="opacity-50" />
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-screen max-w-90 p-0" align="start">
							<Command.Root shouldFilter={false} class="w-full">
								<Command.Input bind:value={customerQuerySearch} placeholder="Zoek klant..." />
								<Command.List>
									{#if customersQuery.isFetching}
										<div class="text-muted-foreground flex justify-center py-6 text-center text-sm">
											<Loader2 class="text-muted-foreground h-4 w-4 animate-spin" />
										</div>
									{:else}
										<Command.Empty>Geen klanten gevonden.</Command.Empty>
										<Command.Group>
											{#each customersQuery.data?.customers || [] as customer (customer.id)}
												<Command.Item value={customer.id} onSelect={() => selectCustomer(customer)}>
													<Check
														class={cn(
															selectedCustomer?.id !== customer.id && 'shrink-0 text-transparent'
														)}
													/>
													<div class="flex flex-col overflow-hidden text-left">
														<span class="truncate">{customer.name}</span>
														<span class="text-muted-foreground truncate text-xs"
															>{customer.email}</span
														>
													</div>
												</Command.Item>
											{/each}
										</Command.Group>
									{/if}
								</Command.List>
								<div class="border-t p-1">
									<Button
										variant="ghost"
										class="w-full justify-start gap-2 overflow-hidden"
										onclick={() => {
											customerForm.name = customerQuerySearch;
											openCreateCustomerDialog();
										}}
									>
										<Plus class="h-4 w-4 shrink-0" />
										<span class="truncate"
											>Nieuwe klant
											{#if customerQuerySearch}
												"{customerQuerySearch}"
											{/if}
										</span>
									</Button>
								</div>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>

				<Separator />

				<div class="grid gap-4">
					<div class="space-y-2">
						<Label for="title">Titel</Label>
						<Input
							id="title"
							bind:value={title}
							oninput={() => {
								titleTouched = true;
							}}
							placeholder="Afspraak titel"
						/>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label>Dienst</Label>
							<Select.Root type="single" bind:value={serviceId}>
								<Select.Trigger class="w-full">
									{services.find((service) => service.id === serviceId)?.name || 'Selecteer dienst'}
								</Select.Trigger>
								<Select.Content>
									{#each services as service (service.id)}
										<Select.Item value={service.id}>{service.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label>Medewerker</Label>
							<Select.Root type="single" bind:value={memberId}>
								<Select.Trigger class="w-full">
									{members.find((member) => member.id === memberId)?.user.name ||
										'Selecteer medewerker'}
								</Select.Trigger>
								<Select.Content>
									{#each members as member (member.id)}
										<Select.Item value={member.id}>{member.user.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Datum en tijd</Label>
						<div class="rounded-lg border p-3">
							<CalendarCardDatePicker bind:startDate bind:endDate timezone={timeZone} />
						</div>
					</div>

					<div class="space-y-2">
						<Label>Status</Label>
						<Select.Root bind:value={status} type="single">
							<Select.Trigger class="w-full">
								{status === 'PENDING'
									? 'In afwachting'
									: status === 'CONFIRMED'
										? 'Bevestigd'
										: status === 'COMPLETED'
											? 'Voltooid'
											: 'Geannuleerd'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="PENDING">In afwachting</Select.Item>
								<Select.Item value="CONFIRMED">Bevestigd</Select.Item>
								<Select.Item value="COMPLETED">Voltooid</Select.Item>
								<Select.Item value="CANCELLED">Geannuleerd</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="notes">Notities</Label>
						<Textarea
							id="notes"
							bind:value={notes}
							placeholder="Interne notities of bijzonderheden"
							class="min-h-24"
						/>
					</div>
				</div>
			</div>
		</ScrollArea>

		<Sheet.Footer>
			<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						open = false;
						resetForm();
					}}>Annuleren</Button
				>
				<Button type="button" disabled={upsertCalendarItem.isPending} onclick={saveAppointment}>
					{#if upsertCalendarItem.isPending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Bezig met opslaan...
					{:else}
						Afspraak opslaan
					{/if}
				</Button>
			</div>
		</Sheet.Footer>
		{#if saveError}
			<p class="text-destructive px-1 text-sm">{saveError}</p>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<Dialog.Root bind:open={createCustomerOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nieuwe klant</Dialog.Title>
			<Dialog.Description>
				Maak direct een klant aan zonder de afspraakstroom te verlaten.
			</Dialog.Description>
		</Dialog.Header>

		<form
			class="space-y-4"
			onsubmit={async (event) => {
				event.preventDefault();
				if (!branch?.id || !validateCustomerForm()) return;
				createCustomerSaving = true;
				try {
					const result = await createCustomerMutation.mutateAsync({
						organizationId: branch.id,
						name: customerForm.name,
						email: customerForm.email,
						phone: customerForm.phone || null,
						address: customerForm.address || null
					});
					selectCustomer(result.customer);
				} finally {
					createCustomerSaving = false;
				}
			}}
		>
			<div class="space-y-2">
				<Label for="customer-name">Naam</Label>
				<Input id="customer-name" bind:value={customerForm.name} />
				{#if customerNameError}
					<p class="text-destructive text-xs">{customerNameError}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="customer-email">E-mail</Label>
				<Input id="customer-email" type="email" bind:value={customerForm.email} />
				{#if customerEmailError}
					<p class="text-destructive text-xs">{customerEmailError}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="customer-phone">Telefoon</Label>
				<Input id="customer-phone" bind:value={customerForm.phone} placeholder="Optioneel" />
			</div>

			<div class="space-y-2">
				<Label for="customer-address">Adres</Label>
				<Textarea
					id="customer-address"
					bind:value={customerForm.address}
					placeholder="Optioneel"
					class="min-h-20"
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (createCustomerOpen = false)}
					>Annuleren</Button
				>
				<Button type="submit" disabled={createCustomerSaving}>
					{#if createCustomerSaving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Bezig met aanmaken...
					{:else}
						Klant aanmaken
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
