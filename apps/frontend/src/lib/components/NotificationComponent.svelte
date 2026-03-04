<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Separator from '$lib/components/ui/separator/index.js';
	import { m } from '$lib/paraglide/messages';

	// Dummy data voor notificaties
	let errorNotifications = $state([
		// {
		// 	id: 1,
		// 	type: 'error',
		// 	title: 'E-mail verzending mislukt',
		// 	message: 'Kon bevestigingsmail niet verzenden naar klant@voorbeeld.nl',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minuten geleden
		// },
		// {
		// 	id: 2,
		// 	type: 'error',
		// 	title: 'Betalingsverwerking fout',
		// 	message: 'Creditcard betaling mislukt voor boeking #12345',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 uur geleden
		// }
	]);

	let warningNotifications = $state([
		// {
		// 	id: 3,
		// 	type: 'warning',
		// 	title: 'Lage beschikbaarheid',
		// 	message: 'Slechts 2 tijdslots beschikbaar voor morgen',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minuten geleden
		// },
		// {
		// 	id: 4,
		// 	type: 'warning',
		// 	title: 'Aankomend onderhoud',
		// 	message: 'Systeemonderhoud gepland voor vanavond om 02:00',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 45) // 45 minuten geleden
		// }
	]);

	let notificaties = $derived(
		[...errorNotifications, ...warningNotifications].sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		)
	);
	let appointmentRequests = $state([
		// Combine errors and warnings into one notificaties array
		// {
		// 	id: 5,
		// 	type: 'appointment',
		// 	customerName: 'Jan Jansen',
		// 	service: 'Knipbeurt',
		// 	requestedTime: new Date(Date.now() + 1000 * 60 * 60 * 24), // Morgen
		// 	message: 'Wil graag een knipbeurt boeken voor morgen om 14:00',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 10) // 10 minuten geleden
		// },
		// {
		// 	id: 6,
		// 	type: 'appointment',
		// 	customerName: 'Marie Smit',
		// 	service: 'Manicure',
		// 	requestedTime: new Date(Date.now() + 1000 * 60 * 60 * 48), // Overmorgen
		// 	message: 'Wil graag een manicure afspraak voor vrijdag ochtend',
		// 	timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minuten geleden
		// }
	]);

	// Bereken totaal aantal notificaties
	let totalNotifications = $derived(
		errorNotifications.length + warningNotifications.length + appointmentRequests.length
	);

	// Formatteer notificatie aantal (9+ voor aantallen boven 9)
	let notificationDisplay = $derived(totalNotifications > 9 ? '9+' : totalNotifications.toString());

	let open = $state(false);

	function formatTime(date: Date) {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Net nu';
		if (diffMins < 60) return `${diffMins}m geleden`;
		if (diffHours < 24) return `${diffHours}u geleden`;
		return `${diffDays}d geleden`;
	}

	function acceptAppointment(id: number) {
		appointmentRequests = appointmentRequests.filter((req) => req.id !== id);
		// Hier zou je normaal een API call maken om de afspraak te accepteren
	}

	function declineAppointment(id: number) {
		appointmentRequests = appointmentRequests.filter((req) => req.id !== id);
		// Hier zou je normaal een API call maken om de afspraak af te wijzen
	}

	function dismissNotification(id: number, type: string) {
		if (type === 'error') {
			errorNotifications = errorNotifications.filter((notif) => notif.id !== id);
		} else if (type === 'warning') {
			warningNotifications = warningNotifications.filter((notif) => notif.id !== id);
		}
	}
</script>

<div class="relative">
	<Popover.Root bind:open>
		<Popover.Trigger
			class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground relative inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
		>
			<BellIcon class="h-[1.2rem] w-[1.2rem]" />
			<span class="sr-only">Notificaties</span>

			{#if totalNotifications > 0}
				<span
					class="bg-destructive absolute -top-2 -right-1 flex h-5 w-5 min-w-[1.25rem] items-center justify-center rounded-full text-xs font-medium text-white"
				>
					{notificationDisplay}
				</span>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-96 p-0" align="end">
			<div class="p-4">
				<h3 class="mb-2 text-lg font-semibold">Notificaties</h3>
				<Tabs.Root value="appointments" class="w-full">
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="appointments" class="relative">
							{m['general.appointments']()}
							{#if appointmentRequests.length > 0}
								<Badge
									variant="destructive"
									class="absolute -top-2 -right-1 flex h-5 w-5 items-center  justify-center p-0 text-xs"
								>
									{appointmentRequests.length}
								</Badge>
							{/if}
						</Tabs.Trigger>
						<Tabs.Trigger value="notificaties" class="relative">
							Notificaties
							{#if notificaties.length > 0}
								<Badge
									variant="destructive"
									class="absolute -top-2 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
								>
									{notificaties.length}
								</Badge>
							{/if}
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="appointments" class="mt-4">
						<div class="max-h-80 space-y-3 overflow-y-auto">
							{#each appointmentRequests as request}
								<div class="bg-card rounded-lg border p-3">
									<div class="flex items-start gap-3">
										<CalendarIcon class="mt-0.5 h-5 w-5 text-blue-500" />
										<div class="min-w-0 flex-1">
											<div class="flex items-center justify-between">
												<h4 class="text-sm font-medium">{request.customerName}</h4>
												<span class="text-muted-foreground text-xs"
													>{formatTime(request.timestamp)}</span
												>
											</div>
											<p class="text-muted-foreground mt-1 text-sm">{request.service}</p>
											<p class="text-muted-foreground mt-1 text-xs">{request.message}</p>
											<div class="mt-3 flex items-center gap-2">
												<Button
													size="sm"
													variant="default"
													class="h-7 px-3"
													onclick={() => acceptAppointment(request.id)}
												>
													<CheckIcon class="mr-1 h-3 w-3" />
													Accepteren
												</Button>
												<Button
													size="sm"
													variant="outline"
													class="h-7 px-3"
													onclick={() => declineAppointment(request.id)}
												>
													<XIcon class="mr-1 h-3 w-3" />
													Afwijzen
												</Button>
											</div>
										</div>
									</div>
								</div>
							{:else}
								<div class="text-center py-8">
									<CalendarIcon class="h-12 w-12 text-muted-foreground mx-auto mb-2" />
									<p class="text-sm text-muted-foreground">Geen afspraakverzoeken</p>
								</div>
							{/each}
						</div>
					</Tabs.Content>

					<Tabs.Content value="notificaties" class="mt-4">
						<div class="max-h-80 space-y-3 overflow-y-auto">
							{#each notificaties as notif}
								<div class="bg-card rounded-lg border p-3">
									<div class="flex items-start gap-3">
										{#if notif.type === 'error'}
											<AlertCircleIcon class="mt-0.5 h-5 w-5 text-red-500" />
										{:else if notif.type === 'warning'}
											<AlertTriangleIcon class="mt-0.5 h-5 w-5 text-orange-500" />
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex items-center justify-between">
												<h4 class="text-sm font-medium">{notif.title}</h4>
												<div class="flex items-center gap-2">
													<span class="text-muted-foreground text-xs"
														>{formatTime(notif.timestamp)}</span
													>
													<Button
														size="sm"
														variant="ghost"
														class="h-6 w-6 p-0"
														onclick={() => dismissNotification(notif.id, notif.type)}
													>
														<XIcon class="h-3 w-3" />
													</Button>
												</div>
											</div>
											<p class="text-muted-foreground mt-1 text-sm">{notif.message}</p>
										</div>
									</div>
								</div>
							{:else}
								<div class="text-center py-8">
									<AlertCircleIcon class="h-12 w-12 text-muted-foreground mx-auto mb-2" />
									<p class="text-sm text-muted-foreground">Geen notificaties</p>
								</div>
							{/each}
						</div>
					</Tabs.Content>
				</Tabs.Root>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
