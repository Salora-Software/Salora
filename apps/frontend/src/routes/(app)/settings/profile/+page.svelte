<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { t } from '$lib/translation';
	import { Separator } from '$lib/components/ui/separator/index';
	import { toast } from 'svelte-sonner';
	import { trpc } from '$lib/trpc';
	import { Image, LoaderCircle } from '@lucide/svelte';
	import SettingsCard from '$lib/components/SettingsCard.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { PasswordInput } from '$lib/components/ui/password-input/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { env } from '$env/dynamic/public';
	import { compressImage } from '$lib/utils';
	let { data } = $props();
	let loading = $state({
		name: false,
		email: false,
		profile: false
	});
</script>

<h2 class=" text-2xl font-semibold">{t.pages.profile}</h2>

<p class="text-muted-foreground max-w-150 text-sm">Wijzig uw profielgegevens.</p>
<Separator class="my-4" />

<div class="flex max-w-full flex-col gap-4">
	<div class=" mb-8 flex flex-col">
		<h3 class="text-md font-semibold">Profielfoto</h3>
		<button
			class="max-w-max"
			onclick={async () => {
				// set loading to true
				// Create hidden file input for image selection
				const fileInput = document.createElement('input');
				fileInput.type = 'file';
				fileInput.accept = 'image/*';
				fileInput.style.display = 'none';
				document.body.appendChild(fileInput);
				// Wait for user to select a file
				const file = await new Promise<File | null>((resolve) => {
					fileInput.addEventListener('change', () => resolve(fileInput.files?.[0] || null));
					fileInput.click();
				});
				document.body.removeChild(fileInput);
				if (!file) {
					return;
				}
				try {
					loading.profile = true;

					const compressedFile = await compressImage(file);

					// Step 1: Generate upload URL
					const { uploadUrl, imageId } =
						await trpc.v2.authenticated.user.generateLogoUploadUrl.mutate({
							fileSize: compressedFile.size
						});

					// Step 2: Upload file directly to S3
					const uploadResponse = await fetch(uploadUrl, {
						method: 'PUT',
						body: compressedFile,
						headers: {
							'Content-Type': compressedFile.type
						}
					});

					if (!uploadResponse.ok) {
						throw new Error('Failed to upload image to S3');
					}

					// Step 3: Confirm upload and update database
					const profileURL = await trpc.v2.authenticated.user.confirmLogoUpload.mutate({
						imageId: imageId
					});

					data.session.user.image = profileURL;

					toast.success('Profielfoto is succesvol bijgewerkt');
				} catch (error) {
					console.error('Error updating profile picture:', error);
					toast.error('Fout bij het bijwerken van de profielfoto');
				}
				// set loading to false
				loading.profile = false;
			}}
		>
			<Avatar.Root class="h-25 w-25 rounded-md">
				<div
					class={`bg-opacity-50 absolute flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-black transition-opacity ${
						loading.profile ? 'opacity-100' : 'opacity-0 hover:opacity-100'
					}`}
				>
					<span class="text-gray-100">
						{#if loading.profile}
							<LoaderCircle class="animate-spin" size="40" />
						{:else}
							<Image size="40" />
						{/if}
					</span>
				</div>
				<Avatar.Image src={env.PUBLIC_CDN_URL + data.session.user.image} alt="@shadcn" />
				<Avatar.Fallback>
					<img src="/images/placeholder-small.svg" alt="" />
				</Avatar.Fallback>
			</Avatar.Root>
		</button>
	</div>
	<SettingsCard
		description="Minimaal 3 karakters, maximaal 20 karakters. Alleen letters, cijfers en underscores."
		onsave={async () => {
			// change the name
			const username = (document.getElementById('name') as HTMLInputElement).value;
			if (username !== data.session.user.name) {
				await trpc.v1.authenticated.user.changeName.mutate({ name: username });
				data.session.user.name = username;
				toast.success('Naam is aangepast');
			} else {
				toast.error('Naam is hetzelfde');
			}
		}}
	>
		<Label for="name" class="text-xl font-semibold">Naam</Label>
		<p class="text-muted-foreground text-sm">Dit is de naam die wordt weergegeven in uw profiel.</p>
		<Input name="name" id="name" class=" mt-4" value={data.session.user.name} required />
	</SettingsCard>
	<SettingsCard
		description="Dit moet een geldig e-mailadres zijn"
		onsave={async () => {
			// change the email
			const email = (document.getElementById('email') as HTMLInputElement).value;
			if (email !== data.session.user.email) {
				await trpc.v1.authenticated.user.changeEmail.mutate({ email: email });
				data.session.user.email = email;
				toast.success('E-mail is aangepast');
			} else {
				toast.error('E-mail is hetzelfde');
			}
		}}
	>
		<Label for="name" class="text-xl font-semibold">E-mail</Label>
		<p class="text-muted-foreground text-sm">
			Dit is het e-mailadres dat wordt gebruikt voor meldingen en is gekoppeld aan uw account.
		</p>
		<Input
			type="email"
			name="email"
			id="email"
			class=" mt-4"
			value={data.session.user.email}
			required
		/>
	</SettingsCard>

	<SettingsCard
		description="Minimaal 8 karakters"
		onsave={async () => {
			const password = (document.getElementById('current-password') as HTMLInputElement).value;
			const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
			await trpc.v1.authenticated.user.changePassword.mutate({ password, newPassword });
			toast.success('Wachtwoord is aangepast');
		}}
	>
		<Label for="name" class="text-xl font-semibold">Verander wachtwoord</Label>

		<p class="text-muted-foreground text-sm">
			Voer in uw huidige wachtwoord en kies een nieuw wachtwoord.
		</p>
		<p class="mt-4 text-sm font-semibold">Huidig wachtwoord</p>
		<PasswordInput
			name="current-password"
			id="current-password"
			placeholder="Huidig wachtwoord"
			autocomplete="current-password"
			required
		/>
		<p class="mt-4 text-sm font-semibold">Nieuw wachtwoord</p>
		<PasswordInput
			name="new-password"
			id="new-password"
			placeholder="Nieuw wachtwoord"
			autocomplete="new-password"
			required
		/>
	</SettingsCard>

	<SettingsCard
		danger
		button="Verwijder account"
		onsave={async () => {
			// change the email
			const email = (document.getElementById('email') as HTMLInputElement).value;
			if (email !== data.session.user.email) {
				await trpc.v1.authenticated.user.changeEmail.mutate({ email: email });
				data.session.user.email = email;
				toast.success('E-mail is aangepast');
			} else {
				toast.error('E-mail is hetzelfde');
			}
		}}
	>
		<Label class="text-xl font-semibold">Account verwijderen</Label>
		<p class="text-muted-foreground text-sm">
			Als u uw account verwijdert, worden al uw gegevens permanent verwijderd. Dit kan niet ongedaan
			gemaakt worden. U kunt altijd een nieuw account aanmaken met hetzelfde e-mailadres.
		</p>
	</SettingsCard>
</div>
