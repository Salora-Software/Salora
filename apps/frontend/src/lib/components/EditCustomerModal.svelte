<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { AlertCircle } from '@lucide/svelte';
	import { trpcQuery, type RouterOutput } from '$lib/trpc';
	import { Loader2 } from '@lucide/svelte';
	import type { QueryClient } from '@tanstack/svelte-query';
	import type { Customer } from '$lib/types';
	import TelInput from './ui/tel-input/tel-input.svelte';

	let {
		open = $bindable(false),
		customer,
		organizationId,
		onClose,
		onUpdate,
		queryClient
	} = $props<{
		customer: Customer | null;
		organizationId: string;
		onClose?: () => void;
		onUpdate?: () => void;
		open: boolean;
		queryClient: QueryClient;
	}>();

	// Form data
	let formData = $state({
		name: customer?.name || '',
		email: customer?.email || '',
		phone: customer?.phone || '',
		address: customer?.address || ''
	});

	// Form errors
	let errors = $state({
		name: '',
		email: ''
	});

	// Track if fields have been touched
	let touched = $state({
		name: false,
		email: false
	});

	// Validate form input
	function validateForm() {
		let isValid = true;

		// Validate name
		if (!formData.name.trim()) {
			errors.name = 'Naam is verplicht';
			isValid = false;
		} else {
			errors.name = '';
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!formData.email.trim()) {
			errors.email = 'E-mail is verplicht';
			isValid = false;
		} else if (!emailRegex.test(formData.email)) {
			errors.email = 'Ongeldig e-mailadres';
			isValid = false;
		} else {
			errors.email = '';
		}

		return isValid;
	}

	// Handle form submission
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		// Mark all fields as touched
		touched.name = true;
		touched.email = true;

		// Validate form
		if (!validateForm() || !customer || !organizationId) return;

		// Submit the form
		await updateCustomer.mutateAsync({
			id: customer.id,
			organizationId,
			name: formData.name,
			email: formData.email,
			phone: formData.phone?.formattedNumber || null,
			address: formData.address || null
		});
		//close
		onUpdate({
			id: customer.id,
			name: formData.name,
			email: formData.email,
			phone: formData.phone || null,
			address: formData.address || null
		});
		open = false;
		onClose();
	}

	// Set up the mutation for updating a customer
	const updateCustomer = trpcQuery.v1.authenticated.customers.updateCustomer.createMutation({
		mutationKey: ['updateCustomer'],
		onMutate: ({ id, name, email, phone, address }) => {
			// Cancel ongoing queries
			queryClient.cancelQueries({
				queryKey: ['v1', 'authenticated', 'customers', 'getCustomer', { id, organizationId }]
			});

			// Save previous customer data
			const previousData = queryClient.getQueryData([
				['v1', 'authenticated', 'customers', 'getCustomer', { id, organizationId }]
			]);
			// Optimistically update the customer data
			if (previousData) {
				queryClient.setQueryData(
					['v1', 'authenticated', 'customers', 'getCustomer', { id, organizationId }],
					{
						customer: {
							...previousData.customer,
							name,
							email,
							phone,
							address
						}
					}
				);
			}

			return { previousData };
		},
		onError: (err, variables, context: any) => {
			// On error, revert to previous data
			if (context?.previousData) {
				queryClient.setQueryData(
					[
						'v1',
						'authenticated',
						'customers',
						'getCustomer',
						{ id: variables.id, organizationId: variables.organizationId }
					],
					context.previousData
				);
			}
		},
		onSettled: (data, error, variables) => {
			// Invalidate and refetch the customer data
			queryClient.invalidateQueries({
				queryKey: [
					'v1',
					'authenticated',
					'customers',
					'getCustomer',
					{ id: variables.id, organizationId: variables.organizationId }
				]
			});

			// Also invalidate the customers list to update any changes there
			queryClient.invalidateQueries({
				queryKey: ['v1', 'authenticated', 'customers', 'getCustomers']
			});
		}
	});

	// Update form data when customer changes
	$effect(() => {
		if (customer) {
			formData.name = customer.name;
			formData.email = customer.email;
			formData.phone = customer.phone || '';
			formData.address = customer.address || '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Klantgegevens bewerken</Dialog.Title>
			<Dialog.Description>
				Pas de gegevens van de klant aan. Klik op opslaan wanneer je klaar bent.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Naam</Label>
				<Input id="name" bind:value={formData.name} error={touched.name && !!errors.name} />
				{#if touched.name && errors.name}
					<p class="text-destructive flex items-center gap-1 text-xs">
						<AlertCircle class="h-3 w-3" />
						{errors.name}
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input
					id="email"
					type="email"
					bind:value={formData.email}
					error={touched.email && !!errors.email}
				/>
				{#if touched.email && errors.email}
					<p class="text-destructive flex items-center gap-1 text-xs">
						<AlertCircle class="h-3 w-3" />
						{errors.email}
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="phone">Telefoon</Label>
				<TelInput id="phone" bind:detailedValue={formData.phone} bind:value={customer.phone} />
			</div>

			<div class="space-y-2">
				<Label for="address">Adres</Label>
				<Input id="address" bind:value={formData.address} />
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						open = false;
						onClose?.();
					}}>Annuleren</Button
				>
				<Button type="submit" disabled={updateCustomer.isPending}>
					{#if updateCustomer.isPending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Bezig met opslaan...
					{:else}
						Opslaan
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
