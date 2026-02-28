<script lang="ts">
	import CircleUser from 'lucide-svelte/icons/circle-user';
	import Menu from 'lucide-svelte/icons/menu';
	import Package2 from 'lucide-svelte/icons/package-2';
	import Search from 'lucide-svelte/icons/search';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Image as ImageIcon, Loader, LoaderCircle } from 'lucide-svelte';
	import { t } from '$lib/translation';
	import { toast } from 'svelte-sonner';
	import Layout from '../+layout.svelte';
	import { SettingsInput, type SettingsInputProps } from '$lib/components/ui/settings-input/index';
	import { organization } from '$lib/auth-client';
	import { tick } from 'svelte';
	import { trpc } from '$lib/trpc';
	import { PUBLIC_CDN_URL } from '$env/static/public';
	import { compressImage } from '$lib/utils';
	let { data } = $props();
	let loading = $state({
		branchLogo: false
	});
	let inputs: { [key: string]: SettingsInputProps[] } = $state({
		branch: [
			{
				title: 'Naam',
				description: 'De naam van de vestiging.',
				type: 'input',
				placeholder: 'Vestiging Naam',
				value: () => data.branchesState.getActiveBranch()?.name || '',
				onclick: async (value) => {
					if (typeof value !== 'string') return;
					let activeBranch = data.branchesState.getActiveBranch();
					if (activeBranch) {
						await organization.update({
							organizationId: activeBranch.id,
							data: {
								name: value
							}
						});
						activeBranch.name = value;
					}
				}
			},
			{
				title: 'Adress',
				description: 'Laat klanten weten waar ze je kunnen vinden.',
				type: 'input',
				placeholder: 'Nederland, Amsterdam, 1234 AB, Straatnaam 1',
				value: () => data.branchesState.getActiveBranch()?.location || '',
				onclick: async (value) => {
					if (typeof value !== 'string') return;
					let activeBranch = data.branchesState.getActiveBranch();
					if (activeBranch) {
						await trpc.v1.authenticated.organization.updateLocation.mutate({
							organizationId: activeBranch.id,
							location: value
						});
						activeBranch.location = value;
					}
				}
			},
			{
				title: 'Website URL',
				description: 'Laat klanten weten waar ze je kunnen vinden op het web.',
				type: 'input',
				placeholder: 'https://example.com',
				value: () => data.branchesState.getActiveBranch()?.website || '',
				onclick: async (value) => {
					if (typeof value !== 'string') return;
					let activeBranch = data.branchesState.getActiveBranch();
					if (activeBranch) {
						await trpc.v1.authenticated.organization.updateWebsite.mutate({
							organizationId: activeBranch.id,
							website: value
						});
						activeBranch.website = value;
					}
				}
			},
			{
				title: 'Telefoonnummer',
				description: 'Laat klanten weten waar ze je kunnen bellen.',
				type: 'input',
				placeholder: '+31 6 12345678',
				value: () => data.branchesState.getActiveBranch()?.phone || '',
				onclick: async (value) => {
					if (typeof value !== 'string') return;
					let activeBranch = data.branchesState.getActiveBranch();
					if (activeBranch) {
						await trpc.v1.authenticated.organization.updatePhone.mutate({
							organizationId: activeBranch.id,
							phone: value
						});
						activeBranch.phone = value;
					}
				}
			},
			{
				title: 'E-email',
				description: 'Laat klanten weten waar ze je kunnen mailen.',
				type: 'input',
				placeholder: 'example@example.com',
				value: () => data.branchesState.getActiveBranch()?.email || '',
				onclick: async (value) => {
					if (typeof value !== 'string') return;
					let activeBranch = data.branchesState.getActiveBranch();
					if (activeBranch) {
						await trpc.v1.authenticated.organization.updateMail.mutate({
							organizationId: activeBranch.id,
							email: value
						});
						activeBranch.email = value;
					}
				}
			}
		],
		danger: [
			{
				title: 'Vestiging Verwijderen',
				description: `Verwijder deze vestiging inclusief de gegevens van deze vestiging. `,
				button: 'Verwijder Vestiging',
				type: 'button',
				value: 'Verwijderen',
				danger: true,
				onclick: async () => {
					const activeBranch = data.branchesState.getActiveBranch();
					if (!activeBranch) {
						toast.error('Er is een fout opgetreden bij het verwijderen van de vestiging');
						return;
					}
					await organization.delete({
						organizationId: activeBranch.id
					});
					document.cookie = 'cache_org_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
					location.href = '/';
				}
			}
		]
	});
	data.branchesState.onBranchChange(async () => {
		// TODO: Dit werkt erg gaar... Maar werkt!
		let savedInputs = inputs;
		inputs = {};
		await tick();
		inputs = savedInputs;
	});
</script>

<h2 class="text-2xl font-semibold">{t.pages.branch}</h2>

<p class="text-muted-foreground max-w-150 text-sm">
	Deze instellingen worden gebruikt om uw klanten te informeren over uw vestiging.
</p>
<Separator class="my-4" />
<div class=" mb-8 flex flex-col">
	<h3 class="text-md font-semibold">Bedrijfslogo</h3>
	<button
		onclick={async () => {
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
			if (!file) return;

			const activeBranch = data.branchesState.getActiveBranch();
			if (!activeBranch) {
				toast.error('No active branch found');
				return;
			}

			try {
				loading.branchLogo = true;

				// Compress the image
				const compressedFile = await compressImage(file);

				console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
				console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

				// Validate compressed file size (2MB limit)
				if (compressedFile.size > 2 * 1024 * 1024) {
					toast.error('File size must be 2MB or less even after compression');
					loading.branchLogo = false;
					return;
				}

				// Step 1: Generate upload URL with compressed file size validation
				const { uploadUrl, imageId } =
					await trpc.v2.authenticated.organization.generateLogoUploadUrl.mutate({
						organizationId: activeBranch.id,
						fileSize: compressedFile.size
					});

				// Step 2: Upload compressed file directly to S3
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
				const logoPath = await trpc.v2.authenticated.organization.confirmLogoUpload.mutate({
					organizationId: activeBranch.id,
					imageId: imageId
				});

				// Update local state
				activeBranch.logo = logoPath;

				toast.success('Logo updated successfully');
			} catch (error) {
				console.error('Error updating logo:', error);
				toast.error('Failed to update logo');
			}
			loading.branchLogo = false;
		}}
	>
		<Avatar.Root class="h-25 w-25 rounded-md">
			<div
				class={`bg-opacity-50 absolute flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-black transition-opacity ${
					loading.branchLogo ? 'opacity-100' : 'opacity-0 hover:opacity-100'
				}`}
			>
				<span class="text-gray-100">
					{#if loading.branchLogo}
						<LoaderCircle class="animate-spin" size="40" />
					{:else}
						<ImageIcon size="40" />
					{/if}
				</span>
			</div>
			<Avatar.Image
				src={PUBLIC_CDN_URL + data.branchesState.getActiveBranch()?.logo}
				alt="@shadcn"
			/>
			<Avatar.Fallback>
				<img src="/images/placeholder-small.svg" alt="" />
			</Avatar.Fallback>
		</Avatar.Root>
	</button>
</div>
{#each inputs.branch as input, i}
	<SettingsInput {...input} value={input.value} class="mx-0 mb-8" />
{/each}

<h2 class="mt-8 text-2xl font-semibold">Gevarenzone</h2>
<div class="rounded-3.75 mt-4 border border-gray-300 py-4">
	{#each inputs.danger as input, i}
		<SettingsInput {...input} bind:value={input.value} class="mx-4" />
		{#if i !== inputs.danger.length - 1}
			<Separator class="my-4 " />
		{/if}
	{/each}
</div>
