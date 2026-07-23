<!-- apps/frontend/src/routes/(onboarding)/onboarding/(wizard)/smtp/+page.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';
	import { Switch } from '$lib/components/ui/switch/index';
	import { Server, Hash, Mail, User, Lock, Eye, EyeOff, Info } from 'lucide-svelte';
	import { getWizardState } from '../wizardState.svelte';

	const wizard = getWizardState();

	// Formulier State
	let useCustomSmtp = $state(false);
	let smtpHost = $state('');
	let smtpPort = $state('587');
	let smtpEmail = $state('');
	let smtpUser = $state('');
	let smtpPassword = $state('');

	let showPassword = $state(false);

	// Valideer of 'Volgende' in de layout actief mag worden
	$effect(() => {
		// Als de custom SMTP switch uit staat, is het optioneel en mag de gebruiker altijd door
		if (!useCustomSmtp) {
			wizard.enableNext();
			return;
		}

		// Als custom SMTP aan staat, moeten ALLE velden ingevuld zijn
		const isAllFilled =
			smtpHost.trim().length > 0 &&
			smtpPort.trim().length > 0 &&
			smtpEmail.trim().length > 0 &&
			smtpUser.trim().length > 0 &&
			smtpPassword.trim().length > 0;

		if (isAllFilled) {
			wizard.enableNext();
		} else {
			wizard.disableNext();
		}
	});
</script>

<div class="space-y-6">
	<!-- SMTP FORMULIER -->
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
</div>
