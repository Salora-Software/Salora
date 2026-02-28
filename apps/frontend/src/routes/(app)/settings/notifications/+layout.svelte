<script lang="ts">
	import { trpcQuery } from '$lib/trpc';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	interface Props {
		data: any;
		children: Snippet;
	}

	let { data, children } = $props();

	const organizationId = $derived(data.branchesState.getActiveBranch()?.id);

	const notificationTypes = [
		{ id: 'EMAIL_APPROVED', name: 'Afspraak bevestigd' },
		{ id: 'EMAIL_CANCELED', name: 'Afspraak geannuleerd' },
		{ id: 'EMAIL_CREATED', name: 'Afspraak gemaakt' }
	];

	const templatesQuery = $derived(
		trpcQuery.v1.authenticated.communication.getTemplates.createQuery(
			{ organizationId },
			{
				queryKey: ['notificationTemplates', organizationId],
				enabled: !!organizationId
			}
		)
	);

	const notifications = $derived({
		customer: notificationTypes.map((n) => ({
			...n,
			target: 'CUSTOMER',
			enabled:
				templatesQuery.data?.find((t: any) => t.type === n.id && t.target === 'CUSTOMER')
					?.enabled ?? false
		})),
		employee: notificationTypes.map((n) => ({
			...n,
			target: 'EMPLOYEE',
			enabled:
				templatesQuery.data?.find((t: any) => t.type === n.id && t.target === 'EMPLOYEE')
					?.enabled ?? false
		}))
	});
</script>

<div class="flex h-full flex-col px-6">
	<div class="grid flex-1 grid-cols-[auto_1fr] gap-8 overflow-hidden">
		<!-- Sidebar -->
		<div class=" w-64 shrink-0 space-y-8 overflow-y-auto border-r pr-6">
			<div class="mt-6 space-y-2">
				<h3 class="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
					Klant notificaties
				</h3>
				<div class="space-y-1">
					{#each notifications.customer as notification}
						{@const isActive = page.url.pathname.includes(`/templates/CUSTOMER/${notification.id}`)}
						<button
							class={cn(
								'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
								isActive
									? 'bg-secondary text-primary font-medium'
									: 'hover:bg-muted text-muted-foreground hover:text-foreground'
							)}
							onclick={() => goto(`/settings/notifications/templates/CUSTOMER/${notification.id}`)}
						>
							<span>{notification.name}</span>
							<div
								class={cn(
									'h-1.5 w-1.5 shrink-0 rounded-full',
									notification.enabled
										? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
										: 'bg-muted-foreground/30'
								)}
							></div>
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<h3 class="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
					Medewerker notificaties
				</h3>
				<div class="space-y-1">
					{#each notifications.employee as notification}
						{@const isActive = page.url.pathname.includes(`/templates/EMPLOYEE/${notification.id}`)}
						<button
							class={cn(
								'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
								isActive
									? 'bg-secondary text-primary font-medium'
									: 'hover:bg-muted text-muted-foreground hover:text-foreground'
							)}
							onclick={() => goto(`/settings/notifications/templates/EMPLOYEE/${notification.id}`)}
						>
							<span>{notification.name}</span>
							<div
								class={cn(
									'h-1.5 w-1.5 shrink-0 rounded-full',
									notification.enabled
										? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
										: 'bg-muted-foreground/30'
								)}
							></div>
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<h3 class="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
					Algemeen
				</h3>
				<div class="space-y-1">
					<button
						class={cn(
							'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
							page.url.pathname.endsWith('/settings')
								? 'bg-secondary text-primary font-medium'
								: 'hover:bg-muted text-muted-foreground hover:text-foreground'
						)}
						onclick={() => goto('/settings/notifications/settings')}
					>
						SMTP Instellingen
					</button>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="my-6 max-h-full min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</div>
	</div>
</div>
