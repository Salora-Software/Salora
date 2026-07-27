<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Loader, LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { trpc, trpcQuery } from '$lib/trpc';

	let { data } = $props();
	let loading = $state(false);
	let values = $state({
		smtpServer: '',
		smtpPort: '',
		smtpUsername: '',
		smtpPassword: '',
		smtpEmail: ''
	});

	const communicationsQuery =
		trpcQuery.v1.authenticated.communication.getCommunications.createQuery(
			{},
			{ queryKey: ['getCommunications'] }
		);

	// Populate form fields when query data arrives
	$effect(() => {
		const emailComm = communicationsQuery.data?.find((c: any) => c.type === 'EMAIL');
		if (emailComm) {
			values.smtpServer = emailComm.smtpServer ?? '';
			values.smtpPort = emailComm.smtpPort?.toString() ?? '';
			values.smtpUsername = emailComm.smtpUsername ?? '';
			values.smtpPassword = emailComm.smtpPassword ?? '';
			values.smtpEmail = emailComm.smtpEmail ?? '';
		}
	});

	async function handleSave() {
		loading = true;
		try {
			await trpc.v1.authenticated.communication.saveCommunications.mutate({
				organizationId: data.branchesState.getActiveBranch()?.id!,
				communications: [
					{
						type: 'EMAIL',
						enabled: true,
						smtpServer: values.smtpServer,
						smtpPort: parseInt(values.smtpPort, 10),
						smtpUsername: values.smtpUsername,
						smtpPassword: values.smtpPassword,
						smtpEmail: values.smtpEmail
					}
				]
			});
			toast.success('SMTP instellingen zijn succesvol bijgewerkt');
			await data.queryClient.invalidateQueries({ queryKey: ['getCommunications'] });
		} catch (error) {
			toast.error('Er is een fout opgetreden bij het bijwerken van SMTP instellingen');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="border-b pb-4">
		<h3 class="text-lg font-medium">Algemene Instellingen</h3>
		<p class="text-muted-foreground text-sm">
			Configureer de communicatiekanalen voor het versturen van notificaties.
		</p>
	</div>

	<div class="space-y-6">
		{#if !communicationsQuery.isLoading}
			<div class="grid max-w-2xl gap-6">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="smtpServer">SMTP-server <span class="text-red-500">*</span></Label>
						<Input
							id="smtpServer"
							disabled={loading}
							bind:value={values.smtpServer}
							placeholder="smtp.example.com"
						/>
						<p class="text-muted-foreground text-xs">Hostnaam van de SMTP-server</p>
					</div>
					<div class="space-y-2">
						<Label for="smtpPort">SMTP-poort <span class="text-red-500">*</span></Label>
						<Input
							id="smtpPort"
							disabled={loading}
							bind:value={values.smtpPort}
							placeholder="587"
						/>
						<p class="text-muted-foreground text-xs">Meestal 587 (TLS) of 465 (SSL)</p>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="smtpEmail">SMTP e-mailadres <span class="text-red-500">*</span></Label>
					<Input
						id="smtpEmail"
						disabled={loading}
						bind:value={values.smtpEmail}
						placeholder="notifications@example.com"
					/>
					<p class="text-muted-foreground text-xs">Afzender adres voor e-mails</p>
				</div>

				<div class="space-y-2">
					<Label for="smtpUsername">SMTP-gebruikersnaam <span class="text-red-500">*</span></Label>
					<Input id="smtpUsername" disabled={loading} bind:value={values.smtpUsername} />
				</div>

				<div class="space-y-2">
					<Label for="smtpPassword">SMTP-wachtwoord <span class="text-red-500">*</span></Label>
					<PasswordInput id="smtpPassword" disabled={loading} bind:value={values.smtpPassword} />
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center py-10">
				<LoaderCircle class="text-muted-foreground h-8 w-8 animate-spin" />
			</div>
		{/if}

		<div class="flex pt-4">
			<Button onclick={handleSave} disabled={loading || communicationsQuery.isLoading}>
				{#if loading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Opslaan
			</Button>
		</div>
	</div>
</div>
