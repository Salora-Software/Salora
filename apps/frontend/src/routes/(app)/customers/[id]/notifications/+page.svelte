<script lang="ts">
	import * as Card from '$lib/components/ui/card/';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import {
		Bell,
		Mail,
		MessageSquare,
		Calendar,
		Clock,
		Check,
		AlertCircle,
		Search,
		Send,
		Eye,
		RotateCcw,
		Settings
	} from '@lucide/svelte';
	import { scale, fly } from 'svelte/transition';

	let { data } = $props();

	// Static notification data
	let notifications = $state([
		{
			id: 1,
			type: 'email',
			title: 'Afspraakbevestiging',
			message: 'Uw afspraak voor Knipbeurt op 25 juli 2025 om 14:00 is bevestigd.',
			status: 'delivered',
			sentAt: '2025-07-24T16:30:00Z',
			readAt: '2025-07-24T17:15:00Z',
			template: 'Afspraak Bevestiging',
			recipient: 'john.doe@example.com'
		},
		{
			id: 2,
			type: 'sms',
			title: 'Herinnering afspraak',
			message: 'Herinnering: Morgen om 14:00 heeft u een afspraak bij Salon Beauty. Tot dan!',
			status: 'delivered',
			sentAt: '2025-07-24T18:00:00Z',
			readAt: null,
			template: 'Afspraak Herinnering',
			recipient: '+31 6 12345678'
		},
		{
			id: 3,
			type: 'email',
			title: 'Factuur verzonden',
			message: 'Factuur #INV-2025-001234 voor uw recente bezoek is verzonden.',
			status: 'delivered',
			sentAt: '2025-07-22T10:15:00Z',
			readAt: '2025-07-22T11:30:00Z',
			template: 'Factuur',
			recipient: 'john.doe@example.com'
		},
		{
			id: 4,
			type: 'system',
			title: 'Loyaliteitspunten toegevoegd',
			message: 'U heeft 25 loyaliteitspunten ontvangen voor uw recente bezoek.',
			status: 'delivered',
			sentAt: '2025-07-22T15:45:00Z',
			readAt: null,
			template: 'Loyaliteit Update',
			recipient: 'In-app notificatie'
		},
		{
			id: 5,
			type: 'email',
			title: 'Afspraak geannuleerd',
			message: 'Uw afspraak van 20 juli is geannuleerd. Neem contact op voor een nieuwe afspraak.',
			status: 'failed',
			sentAt: '2025-07-19T09:20:00Z',
			readAt: null,
			template: 'Afspraak Annulering',
			recipient: 'john.doe@example.com',
			error: 'Invalid email address'
		},
		{
			id: 6,
			type: 'sms',
			title: 'Promotie aanbieding',
			message: '🎉 Speciale aanbieding: 20% korting op alle behandelingen deze week!',
			status: 'pending',
			sentAt: '2025-07-18T14:00:00Z',
			readAt: null,
			template: 'Promotie',
			recipient: '+31 6 12345678'
		}
	]);

	let searchQuery = $state('');
	let selectedType = $state('all');
	let selectedStatus = $state('all');

	// Filter notifications based on search and filters
	let filteredNotifications = $derived(
		notifications.filter((notification) => {
			const matchesSearch =
				searchQuery === '' ||
				notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
				notification.recipient.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType = selectedType === 'all' || notification.type === selectedType;
			const matchesStatus = selectedStatus === 'all' || notification.status === selectedStatus;

			return matchesSearch && matchesType && matchesStatus;
		})
	);

	// Get notification type icon
	function getTypeIcon(type: string) {
		switch (type) {
			case 'email':
				return Mail;
			case 'sms':
				return MessageSquare;
			case 'system':
				return Bell;
			default:
				return Bell;
		}
	}

	// Get notification type color
	function getTypeColor(type: string) {
		switch (type) {
			case 'email':
				return 'text-blue-500';
			case 'sms':
				return 'text-green-500';
			case 'system':
				return 'text-purple-500';
			default:
				return 'text-gray-500';
		}
	}

	// Get status variant
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'delivered':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	// Get status label
	function getStatusLabel(status: string) {
		switch (status) {
			case 'delivered':
				return 'Bezorgd';
			case 'pending':
				return 'In behandeling';
			case 'failed':
				return 'Mislukt';
			default:
				return status;
		}
	}

	// Format date
	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('nl-NL', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Calculate stats
	let totalNotifications = $derived(notifications.length);
	let deliveredCount = $derived(notifications.filter((n) => n.status === 'delivered').length);
	let pendingCount = $derived(notifications.filter((n) => n.status === 'pending').length);
	let failedCount = $derived(notifications.filter((n) => n.status === 'failed').length);

	function resendNotification(id: number) {
		// In a real app, this would trigger a resend
		console.log('Resending notification:', id);

		// Update status to pending for demo
		const notification = notifications.find((n) => n.id === id);
		if (notification) {
			notification.status = 'pending';
			notification.sentAt = new Date().toISOString();
		}
	}

	function markAsRead(id: number) {
		const notification = notifications.find((n) => n.id === id);
		if (notification && !notification.readAt) {
			notification.readAt = new Date().toISOString();
		}
	}
</script>

<!-- Header with Title and Quick Actions -->
<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<h1 class="text-3xl font-semibold">Notificaties</h1>

	<!-- Quick Actions Dropdown -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button variant="outline" class="gap-2" size="sm">
				<Settings class="h-4 w-4" />
				Snelle acties
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-56">
			<DropdownMenu.Group>
				<DropdownMenu.Label>Notificatie acties</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2">
					<Mail class="h-4 w-4" />
					Stuur afspraakbevestiging
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2">
					<MessageSquare class="h-4 w-4" />
					Verstuur SMS herinnering
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2">
					<Send class="h-4 w-4" />
					Factuur versturen
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2">
					<Bell class="h-4 w-4" />
					Promotie notificatie
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2">
					<Calendar class="h-4 w-4" />
					Afspraak herinnering
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2">
					<AlertCircle class="h-4 w-4" />
					Belangrijke update
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

<!-- Summary Cards -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<div class="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
		<div class="flex items-center">
			<div class="flex-1">
				<div class="text-2xl font-semibold text-gray-800 dark:text-gray-200">
					{totalNotifications}
				</div>
				<div class="text-muted-foreground text-sm">Totaal verzonden</div>
			</div>
			<Bell class="h-6 w-6 text-gray-400" />
		</div>
	</div>

	<div
		class="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm dark:from-green-900/30 dark:to-emerald-900/20"
	>
		<div class="flex items-center">
			<div class="flex-1">
				<div class="text-2xl font-semibold text-green-600 dark:text-green-400">
					{deliveredCount}
				</div>
				<div class="text-sm text-green-600/80 dark:text-green-400/80">Bezorgd</div>
			</div>
			<Check class="h-6 w-6 text-green-500" />
		</div>
	</div>

	<div
		class="rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 p-4 shadow-sm dark:from-yellow-900/30 dark:to-amber-900/20"
	>
		<div class="flex items-center">
			<div class="flex-1">
				<div class="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
					{pendingCount}
				</div>
				<div class="text-sm text-yellow-600/80 dark:text-yellow-400/80">In behandeling</div>
			</div>
			<Clock class="h-6 w-6 text-yellow-500" />
		</div>
	</div>

	<div
		class="rounded-lg bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-sm dark:from-red-900/30 dark:to-rose-900/20"
	>
		<div class="flex items-center">
			<div class="flex-1">
				<div class="text-2xl font-semibold text-red-600 dark:text-red-400">
					{failedCount}
				</div>
				<div class="text-sm text-red-600/80 dark:text-red-400/80">Mislukt</div>
			</div>
			<AlertCircle class="h-6 w-6 text-red-500" />
		</div>
	</div>
</div>

<!-- Filters and Search -->
<div class="my-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class="relative flex-1">
		<Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
		<Input placeholder="Zoek notificaties..." bind:value={searchQuery} class="w-full pl-9" />
	</div>

	<div class="flex gap-2">
		<Select.Root type="single" bind:value={selectedType}>
			<Select.Trigger class="w-32">
				<span>{selectedType === 'all' ? 'Alle types' : selectedType}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">Alle types</Select.Item>
				<Select.Item value="email">Email</Select.Item>
				<Select.Item value="sms">SMS</Select.Item>
				<Select.Item value="system">Systeem</Select.Item>
			</Select.Content>
		</Select.Root>

		<Select.Root type="single" bind:value={selectedStatus}>
			<Select.Trigger class="w-32">
				<span>{selectedStatus === 'all' ? 'Alle statussen' : getStatusLabel(selectedStatus)}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">Alle statussen</Select.Item>
				<Select.Item value="delivered">Bezorgd</Select.Item>
				<Select.Item value="pending">In behandeling</Select.Item>
				<Select.Item value="failed">Mislukt</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
</div>

<!-- Notifications List -->
<div class="space-y-4">
	{#if filteredNotifications.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12">
				<Bell class="mb-4 h-12 w-12 text-gray-400" />
				<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
					Geen notificaties gevonden
				</h3>
				<p class="text-muted-foreground mt-1 text-sm">
					{searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
						? 'Pas uw filters aan om meer resultaten te zien.'
						: 'Er zijn nog geen notificaties verzonden naar deze klant.'}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		{#each filteredNotifications as notification (notification.id)}
			<Card.Root class="transition-all hover:shadow-md">
				<div transition:scale={{ duration: 200, start: 0.98 }}>
					<Card.Content class="p-6">
						<div class="flex items-start justify-between">
							<div class="flex items-start gap-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
								>
									{#if notification.type === 'email'}
										<Mail class={`h-5 w-5 ${getTypeColor(notification.type)}`} />
									{:else if notification.type === 'sms'}
										<MessageSquare class={`h-5 w-5 ${getTypeColor(notification.type)}`} />
									{:else}
										<Bell class={`h-5 w-5 ${getTypeColor(notification.type)}`} />
									{/if}
								</div>

								<div class="min-w-0 flex-1">
									<div class="mb-1 flex items-center gap-2">
										<h3 class="font-medium text-gray-900 dark:text-gray-100">
											{notification.title}
										</h3>
										<Badge variant={getStatusVariant(notification.status)}>
											{getStatusLabel(notification.status)}
										</Badge>
										{#if notification.readAt}
											<Badge variant="outline">
												<Eye class="mr-1 h-3 w-3" />
												Gelezen
											</Badge>
										{/if}
									</div>

									<p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
										{notification.message}
									</p>

									<div class="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
										<div class="flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											Verzonden: {formatDate(notification.sentAt)}
										</div>
										{#if notification.readAt}
											<div class="flex items-center gap-1">
												<Eye class="h-3 w-3" />
												Gelezen: {formatDate(notification.readAt)}
											</div>
										{/if}
									</div>

									<div class="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-500 sm:grid-cols-2">
										<div>Template: {notification.template}</div>
										<div>Ontvanger: {notification.recipient}</div>
									</div>

									{#if notification.error}
										<div class="mt-2 rounded-md bg-red-50 p-2 dark:bg-red-900/20">
											<div class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
												<AlertCircle class="h-3 w-3" />
												Error: {notification.error}
											</div>
										</div>
									{/if}
								</div>
							</div>

							<div class="flex flex-col gap-2">
								{#if notification.status === 'failed'}
									<Button
										variant="outline"
										size="sm"
										onclick={() => resendNotification(notification.id)}
										class="gap-1"
									>
										<RotateCcw class="h-3 w-3" />
										Opnieuw verzenden
									</Button>
								{/if}

								{#if !notification.readAt}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => markAsRead(notification.id)}
										class="gap-1"
									>
										<Eye class="h-3 w-3" />
										Markeer als gelezen
									</Button>
								{/if}
							</div>
						</div>
					</Card.Content>
				</div>
			</Card.Root>
		{/each}
	{/if}
</div>
