<!-- apps/frontend/src/routes/(app)/onboarding/(wizard)/smtp/+page.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';
	import { Switch } from '$lib/components/ui/switch/index';
	import Server from '@solar-icons/svelte/linear/server';
	import Hash from '@solar-icons/svelte/linear/hashtag';
	import Mail from '@solar-icons/svelte/linear/letter';
	import User from '@solar-icons/svelte/linear/user';
	import Lock from '@solar-icons/svelte/linear/lock';
	import Eye from '@solar-icons/svelte/linear/eye';
	import EyeOff from '@solar-icons/svelte/linear/eye-closed';
	import { onMount } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { getWizardState } from '../wizardState.svelte';
	import { orpcT } from '$lib/orpc';
	import { organization } from '$lib/auth-client';
	import { trpc } from '$lib/trpc';

	let { data } = $props();
	const wizard = getWizardState();

	let branchesQuery = createQuery(() => orpcT.v1.organisation.getOrganisations.queryOptions());
	const orgId = $derived(
		branchesQuery.data?.find((branch) => (branch.onboardingStep ?? 0) > 0)?.id ||
			data.session?.session.activeOrganizationId ||
			''
	);

	// Formulier State
	let useCustomSmtp = $state(false);
	let smtpHost = $state('');
	let smtpPort = $state('587');
	let smtpEmail = $state('');
	let smtpUser = $state('');
	let smtpPassword = $state('');

	let showPassword = $state(false);
	let loading = $state(true);

	const isAllFilled = $derived(
		smtpHost.trim().length > 0 &&
			smtpPort.trim().length > 0 &&
			smtpEmail.trim().length > 0 &&
			smtpUser.trim().length > 0 &&
			smtpPassword.trim().length > 0
	);

	onMount(async () => {
		try {
			const communications = await trpc.v1.authenticated.communication.getCommunications.query({});
			const emailCommunication = communications.find((c) => c.type === 'EMAIL');
			if (emailCommunication?.smtpServer) {
				smtpHost = emailCommunication.smtpServer ?? '';
				smtpPort = emailCommunication.smtpPort?.toString() || '587';
				smtpEmail = emailCommunication.smtpEmail ?? '';
				smtpUser = emailCommunication.smtpUsername ?? '';
				smtpPassword = emailCommunication.smtpPassword ?? '';
				useCustomSmtp = true;
			}
		} catch (error) {
			console.error('Kon e-mailinstellingen niet laden:', error);
		} finally {
			loading = false;
		}
	});

	wizard.setOnNext(async () => {
		// SMTP is optioneel: laat de standaardserver gebruiken als de switch uit staat.
		if (!useCustomSmtp) return true;

		if (!isAllFilled) {
			toast.error('Vul alle SMTP-velden in of schakel de eigen server uit');
			return false;
		}

		const organizationId = orgId;
		if (!organizationId) {
			toast.error('Geen actieve vestiging gevonden');
			return false;
		}

		try {
			await organization.setActive({ organizationId });
			await trpc.v1.authenticated.communication.saveCommunications.mutate({
				organizationId,
				communications: [
					{
						type: 'EMAIL',
						enabled: true,
						smtpServer: smtpHost,
						smtpPort: Number(smtpPort),
						smtpUsername: smtpUser,
						smtpPassword: smtpPassword,
						smtpEmail
					}
				]
			});
			toast.success('E-mailinstellingen opgeslagen');
			return true;
		} catch (error) {
			console.error('Kon e-mailinstellingen niet opslaan:', error);
			toast.error('Er is een fout opgetreden bij het opslaan van de e-mailinstellingen');
			return false;
		}
	});

	// Valideer of 'Volgende' in de layout actief mag worden
	$effect(() => {
		if (!useCustomSmtp) {
			wizard.enableNext();
			return;
		}

		if (isAllFilled) {
			wizard.enableNext();
		} else {
			wizard.disableNext();
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between rounded-lg border p-4">
		<div class="space-y-1">
			<Label for="use-custom-smtp" class="font-medium text-neutral-700"
				>Eigen e-mailserver gebruiken</Label
			>
			<p class="text-sm text-neutral-500">
				Optioneel. Laat uitgeschakeld om de standaard e-mailserver te gebruiken.
			</p>
		</div>
		<Switch id="use-custom-smtp" bind:checked={useCustomSmtp} disabled={loading} />
	</div>

	{#if useCustomSmtp}
		<div class="space-y-4 pt-2">
			<!-- HOST EN POORT -->
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2 space-y-2">
					<Label for="smtp-host" class="font-medium text-neutral-700">SMTP-server (Host)</Label>
					<div class="relative">
						<Input
							id="smtp-host"
							type="text"
							bind:value={smtpHost}
							placeholder="smtp.jouwdomein.nl"
							class="focus-visible:ring-primary h-10  pl-10"
						/>
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
						>
							<Server class="h-4 w-4" />
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="smtp-port" class="font-medium text-neutral-700">Poort</Label>
					<div class="relative">
						<Input
							id="smtp-port"
							type="text"
							bind:value={smtpPort}
							placeholder="587"
							class="focus-visible:ring-primary h-10  pl-10"
						/>
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
						>
							<Hash class="h-4 w-4" />
						</div>
					</div>
				</div>
			</div>

			<!-- AFZENDER EMAIL -->
			<div class="space-y-2">
				<Label for="smtp-email" class="font-medium text-neutral-700"
					>SMTP e-mailadres (Afzender)</Label
				>
				<div class="relative">
					<Input
						id="smtp-email"
						type="email"
						bind:value={smtpEmail}
						placeholder="info@jouwsalon.nl"
						class="focus-visible:ring-primary h-10  pl-10"
					/>
					<div
						class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
					>
						<Mail class="h-4 w-4" />
					</div>
				</div>
			</div>

			<!-- GEBRUIKERSNAAM EN WACHTWOORD -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="smtp-user" class="font-medium text-neutral-700">SMTP-gebruikersnaam</Label>
					<div class="relative">
						<Input
							id="smtp-user"
							type="text"
							bind:value={smtpUser}
							placeholder="info@jouwsalon.nl"
							class="focus-visible:ring-primary h-10  pl-10"
						/>
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
						>
							<User class="h-4 w-4" />
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="smtp-password" class="font-medium text-neutral-700">SMTP-wachtwoord</Label>
					<div class="relative">
						<Input
							id="smtp-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={smtpPassword}
							placeholder="••••••••••••"
							class="focus-visible:ring-primary h-10  pr-10 pl-10"
						/>
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400"
						>
							<Lock class="h-4 w-4" />
						</div>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
						>
							{#if showPassword}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
