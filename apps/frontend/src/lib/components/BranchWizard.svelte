<script lang="ts">
	import { ConfigWizard } from '$lib/components/ui/config-wizard';
	import { SettingsInput, type SettingsInputProps } from '$lib/components/ui/settings-input/index';
	import * as Avatar from '$lib/components/ui/avatar/index';
	import * as Select from '$lib/components/ui/select/index';
	import { Separator } from '$lib/components/ui/separator/index';
	import Confetti from 'svelte-confetti';
	import { Button } from '$lib/components/ui/button';
	import { Image, ImageIcon, LoaderCircle, Plus, UserRound } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Products from './Products.svelte';
	import timezones from '$lib/timezones.json';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import Employees from './Employees.svelte';
	import { compressImage, convertToSlug } from '$lib/utils';
	import { trpc } from '$lib/trpc';
	import { fade, slide, fly } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import type {
		BranchesType,
		SessionUserType,
		BranchWizardState,
		BranchesState
	} from '$lib/runes.svelte';
	import type { QueryClient } from '@tanstack/svelte-query';
	import { env } from '$env/dynamic/public';
	import { organization } from '$lib/auth-client';
	import { Input } from '$lib/components/ui/input/index';
	import Label from './ui/label/label.svelte';
	import { TimeSlotScheduler } from './ui/time-slot-scheduler';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { t } from '$lib/translation';
	import { untrack } from 'svelte';
	import { colors } from '$lib/colors';

	let {
		data
	}: {
		data: {
			session: SessionUserType;
			branches: BranchesType;
			branchWizardState: BranchWizardState;
			branchesState: BranchesState;
			queryClient: QueryClient;
		};
	} = $props();

	const loading = $state({
		branchLogo: false
	});
	let newEmployee = $state(() => {});
	let activeBranch = $state(data.branchesState.getActiveBranch());
	let value = $state('');

	// Employee form state
	let employeeValues = $state({
		name: '',
		email: '',
		role: 'member',
		sheet: {
			active: false,
			loading: false
		}
	});
	let wizardInputs: {
		[key: string]: SettingsInputProps[];
	} = $state({
		company: [
			{
				title: 'Foto',
				value: ''
			},
			{
				title: 'Bedrijfsnaam',
				type: 'input',
				placeholder: 'Voer bedrijfsnaam in',
				value: '',
				description: () => {
					const value =
						typeof wizardInputs.company[1].value === 'function'
							? wizardInputs.company[1].value()
							: wizardInputs.company[1].value;
					return Array.isArray(value)
						? convertToSlug(String(value[0]))
						: convertToSlug(String(value));
				}
			},
			{
				title: 'Adres',
				type: 'input',
				placeholder: 'Voer adres in',
				value: ''
			},
			{
				title: 'Telefoonnummer',
				type: 'input',
				placeholder: 'Voer telefoonnummer in',
				value: ''
			},
			{
				title: 'E-mailadres',
				type: 'input',
				placeholder: 'Voer e-mailadres in',
				value: ''
			},
			{
				title: 'Website',
				type: 'input',
				placeholder: 'Voer website in',
				value: ''
			},
			{
				title: 'Tijdzone',
				type: 'select',
				options: timezones.map((timezone) => {
					return { value: timezone, label: timezone };
				}),
				value: 'Europe/Amsterdam'
			}
		]
	});
	const defaultBusinessLayout = [
		{
			day: 1,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 2,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 3,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 4,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 5,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		}
	];
	let businessHours:
		| {
				id?: string;
				day: number;
				openHour: string;
				openMinute: string;
				closeHour: string;
				closeMinute: string;
		  }[]
		| [] = $state([...defaultBusinessLayout]);

	let pendingDeletion: string[] = $state([]);
	let nextStep: (() => Promise<void>) | null = $state(null);

	// SMTP settings state
	let smtpValues = $state({
		loading: false,
		smtpServer: '',
		smtpPort: '',
		smtpUsername: '',
		smtpPassword: '',
		smtpEmail: ''
	});

	// Initialize newEmployee function
	newEmployee = () => {
		employeeValues.sheet.active = true;
		employeeValues.name = '';
		employeeValues.email = '';
		employeeValues.role = 'member';
	};

	async function saveEmployee() {
		employeeValues.sheet.loading = true;
		try {
			if (!activeBranch) {
				toast.error('Er is geen actieve vestiging');
				return;
			}

			const user = await trpc.v1.authenticated.employees.createEmployee.mutate({
				organizationId: activeBranch.id,
				name: employeeValues.name,
				email: employeeValues.email,
				role: employeeValues.role
			});

			activeBranch.members.push({
				id: user.id,
				role: employeeValues.role,
				services: [],
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: null,
					phone: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					emailVerified: false
				},
				availability: []
			});

			toast.success('Medewerker is succesvol toegevoegd');
			employeeValues.sheet.active = false;
		} catch (error) {
			toast.error('Er is een fout opgetreden bij het toevoegen van de medewerker');
		}
		employeeValues.sheet.loading = false;
	}

	async function updateOpeningTimes() {
		pendingDeletion = [];
		if (!activeBranch) return;
		await data.branchesState.updateOpeningTimes();
		if (activeBranch.openingTimes.length == 0) {
			businessHours = [...defaultBusinessLayout];
			return;
		}
		businessHours = activeBranch.openingTimes.map((slot) => {
			const [openHour, openMinute] = slot.startTimeLocal.split(':');
			const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
			return {
				id: slot.id,
				day: slot.dayOfWeek,
				openHour,
				openMinute,
				closeHour,
				closeMinute
			};
		});
	}

	async function loadSmtpCommunications() {
		smtpValues.loading = true;
		try {
			const communications = await trpc.v1.authenticated.communication.getCommunications.query({});
			const emailCommunication = communications.find((c) => c.type === 'EMAIL');
			if (emailCommunication) {
				smtpValues.smtpServer = emailCommunication.smtpServer || '';
				smtpValues.smtpPort = emailCommunication.smtpPort?.toString() || '';
				smtpValues.smtpUsername = emailCommunication.smtpUsername || '';
				smtpValues.smtpPassword = emailCommunication.smtpPassword || '';
				smtpValues.smtpEmail = emailCommunication.smtpEmail || '';
			}
		} catch (error) {
			console.error('Error loading SMTP communications:', error);
		} finally {
			smtpValues.loading = false;
		}
	}
	let steps = $state([
		{
			name: 'Bedrijf',
			id: 'company',
			onnext: async () => {
				// check if wizardInputs.company are all filled (except the first one which is the photo)
				let errored = false;
				for (let i = 1; i < wizardInputs.company.length; i++) {
					const input = wizardInputs.company[i];
					if (!input.value) {
						errored = true;
						input.errored = 'Dit veld is verplicht';
					} else {
						input.errored = '';
					}
				}
				if (errored) {
					toast.error('Vul alle velden in');
					return false;
				}
				if (data.branchWizardState?.value?.id == activeBranch?.id && activeBranch) {
					await trpc.v1.authenticated.organization.updateBranch.mutate({
						organizationId: activeBranch.id,
						name: wizardInputs.company[1].value as string,
						location: wizardInputs.company[2].value as string,
						phone: wizardInputs.company[3].value as string,
						email: wizardInputs.company[4].value as string,
						website: wizardInputs.company[5].value as string,
						timezone: wizardInputs.company[6].value as string
					});
					if (
						wizardInputs.company[0].value &&
						typeof wizardInputs.company[0].value === 'string' &&
						!wizardInputs.company[0].value.includes(env.PUBLIC_CDN_URL)
					) {
						// upload new logo

						const logoDataUrl = wizardInputs.company[0].value as string;
						if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
							try {
								// Convert data URL back to File for upload
								const dataUrlToFile = (dataUrl: string, filename: string): File => {
									const arr = dataUrl.split(',');
									const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
									const bstr = atob(arr[1]);
									let n = bstr.length;
									const u8arr = new Uint8Array(n);
									while (n--) {
										u8arr[n] = bstr.charCodeAt(n);
									}
									return new File([u8arr], filename, { type: mime });
								};

								const logoFile = dataUrlToFile(logoDataUrl, 'logo.jpg');

								// Validate file size (2MB limit)
								if (logoFile.size > 2 * 1024 * 1024) {
									toast.error('File size must be 2MB or less');
									return true;
								}

								// Step 1: Generate upload URL
								const { uploadUrl, imageId } =
									await trpc.v2.authenticated.organization.generateLogoUploadUrl.mutate({
										organizationId: activeBranch.id,
										fileSize: logoFile.size
									});

								// Step 2: Upload file directly to S3
								const uploadResponse = await fetch(uploadUrl, {
									method: 'PUT',
									body: logoFile,
									headers: {
										'Content-Type': logoFile.type
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
								//update the branch url
								let reference = data.branchesState.getActiveBranch();
								if (reference) reference.logo = env.PUBLIC_CDN_URL + logoPath;
							} catch (error) {
								console.error('Error uploading logo:', error);
								toast.error('Logo upload mislukt');
							}
						}
					}
					toast.success('Vestiging succesvol bijgewerkt');
					return true;
				} else {
					const newBranch = await trpc.v1.authenticated.organization.createBranch.mutate({
						name: wizardInputs.company[1].value as string,
						location: wizardInputs.company[2].value as string,
						phone: wizardInputs.company[3].value as string,
						email: wizardInputs.company[4].value as string,
						website: wizardInputs.company[5].value as string,
						timezone: wizardInputs.company[6].value as string
					});
					await data.branchesState.setActiveBranchById(newBranch.id);

					// Upload logo if one was selected
					const logoDataUrl = wizardInputs.company[0].value as string;
					if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
						try {
							// Convert data URL back to File for upload
							const dataUrlToFile = (dataUrl: string, filename: string): File => {
								const arr = dataUrl.split(',');
								const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
								const bstr = atob(arr[1]);
								let n = bstr.length;
								const u8arr = new Uint8Array(n);
								while (n--) {
									u8arr[n] = bstr.charCodeAt(n);
								}
								return new File([u8arr], filename, { type: mime });
							};

							const logoFile = dataUrlToFile(logoDataUrl, 'logo.jpg');

							// Validate file size (2MB limit)
							if (logoFile.size > 2 * 1024 * 1024) {
								toast.error('File size must be 2MB or less');
								return true;
							}

							// Step 1: Generate upload URL
							const { uploadUrl, imageId } =
								await trpc.v2.authenticated.organization.generateLogoUploadUrl.mutate({
									organizationId: newBranch.id,
									fileSize: logoFile.size
								});

							// Step 2: Upload file directly to S3
							const uploadResponse = await fetch(uploadUrl, {
								method: 'PUT',
								body: logoFile,
								headers: {
									'Content-Type': logoFile.type
								}
							});

							if (!uploadResponse.ok) {
								throw new Error('Failed to upload image to S3');
							}

							// Step 3: Confirm upload and update database
							const logoPath = await trpc.v2.authenticated.organization.confirmLogoUpload.mutate({
								organizationId: newBranch.id,
								imageId: imageId
							});

							console.log('Logo uploaded successfully:', logoPath);
							toast.success('Vestiging en logo succesvol aangemaakt');
						} catch (error) {
							console.error('Error uploading logo:', error);
							toast.error('Vestiging aangemaakt, maar logo upload mislukt');
						}
					} else {
						toast.success('Vestiging succesvol aangemaakt');
					}
				}
				return true;
			}
		},
		{
			name: 'Openingstijden',
			id: 'opening-hours',
			onnext: async () => {
				loading.branchLogo = true;
				try {
					if (!activeBranch) throw new Error('No active branch');
					const updatedTimes = await trpc.v1.authenticated.schedule.updateOpeningTimes.mutate({
						organizationId: activeBranch.id,
						removeItems: pendingDeletion,
						openingTimes: businessHours.map((slot) => ({
							id: slot.id,
							dayOfWeek: slot.day,
							startTimeLocal: `${slot.openHour}:${slot.openMinute}`,
							endTimeLocal: `${slot.closeHour}:${slot.closeMinute}`
						}))
					});
					activeBranch.openingTimes = updatedTimes;
					data.branchesState.updateActiveBranch(activeBranch);
					pendingDeletion = []; // Reset pending deletions after successful save
					toast.success(`Succesvol bijgewerkt`);
					return true;
				} catch (error) {
					return false;
				} finally {
					loading.branchLogo = false;
				}
			}
		},
		{ name: 'Producten', id: 'products' },
		{
			name: 'SMTP instellingen',
			id: 'smtp',
			onnext: async () => {
				// SMTP settings are optional - if any field is filled, all fields must be filled
				const hasAnyValue =
					smtpValues.smtpServer ||
					smtpValues.smtpPort ||
					smtpValues.smtpUsername ||
					smtpValues.smtpPassword ||
					smtpValues.smtpEmail;

				if (hasAnyValue) {
					// If any field is filled, all fields must be filled
					if (
						!smtpValues.smtpServer ||
						!smtpValues.smtpPort ||
						!smtpValues.smtpUsername ||
						!smtpValues.smtpPassword ||
						!smtpValues.smtpEmail
					) {
						toast.error(
							'Als u SMTP wilt configureren, vul dan alle velden in of laat ze allemaal leeg om over te slaan'
						);
						return false;
					}

					smtpValues.loading = true;
					try {
						if (!activeBranch) throw new Error('No active branch');

						await trpc.v1.authenticated.communication.saveCommunications.mutate({
							organizationId: activeBranch.id,
							communications: [
								{
									type: 'EMAIL',
									enabled: true,
									smtpServer: smtpValues.smtpServer,
									smtpPort: parseInt(smtpValues.smtpPort, 10),
									smtpUsername: smtpValues.smtpUsername,
									smtpPassword: smtpValues.smtpPassword,
									smtpEmail: smtpValues.smtpEmail
								}
							]
						});
						toast.success('SMTP instellingen succesvol opgeslagen');
					} catch (error) {
						toast.error('Er is een fout opgetreden bij het opslaan van SMTP instellingen');
						return false;
					} finally {
						smtpValues.loading = false;
					}
				}

				return true;
			}
		},
		{
			name: 'Medewerkers',
			id: 'employees',
			onnext: async () => {
				await trpc.v1.authenticated.organization.finishOnboarding.mutate({
					organizationId: activeBranch?.id || ''
				});
				await data.branchesState.updateBranches();
				return true;
			}
		}
	]);
	const finalSteps = $derived(
		[
			...(data.branchWizardState?.value?.notClosable
				? [
						{
							name: 'Welkom',
							id: 'welcome',
							onnext: async () => {
								return true;
							}
						}
					]
				: []),
			...steps
		].map((step, index) => ({
			...step,
			active: index === data.branchWizardState?.value?.step,
			completed: index < data.branchWizardState?.value?.step,
			onnext: async () => {
				const result = await step.onnext?.();
				if (!result && step.onnext) return false;
				if (activeBranch && index < finalSteps.length - 1)
					trpc.v1.authenticated.organization.updateOnboardingStep.mutate({
						organizationId: activeBranch.id,
						step: data.branchWizardState?.value?.notClosable ? index : index + 1
					});
				return true;
			}
		}))
	);

	// Initialize opening times when component loads
	updateOpeningTimes();

	data.branchesState.onBranchChange((branch) => {
		if (branch) {
			activeBranch = branch;
			updateOpeningTimes();
			loadSmtpCommunications();
		}
	});

	$effect(() => {
		if (activeBranch && data.branchWizardState.value.id === activeBranch.id) {
			wizardInputs.company[0].value = env.PUBLIC_CDN_URL + activeBranch.logo;
			wizardInputs.company[1].value = activeBranch.name ?? '';
			wizardInputs.company[2].value = activeBranch.location ?? '';
			wizardInputs.company[3].value = activeBranch.phone ?? '';
			wizardInputs.company[4].value = activeBranch.email ?? '';
			wizardInputs.company[5].value = activeBranch.website ?? '';
			wizardInputs.company[6].value = activeBranch.timeZone ?? 'Europe/Amsterdam';

			// Initialize business hours from active branch
			if (activeBranch.openingTimes && activeBranch.openingTimes.length > 0) {
				businessHours = activeBranch.openingTimes.map((slot) => {
					const [openHour, openMinute] = slot.startTimeLocal.split(':');
					const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
					return {
						id: slot.id,
						day: slot.dayOfWeek,
						openHour,
						openMinute,
						closeHour,
						closeMinute
					};
				});
			} else {
				businessHours = [...defaultBusinessLayout];
			}
		}
	});
</script>

<ConfigWizard
	steps={finalSteps}
	bind:open={data.branchWizardState.value.open}
	title="Nieuwe vestiging"
	bind:value
	bind:onNext={nextStep}
	fullscreen={value === 'welcome'}
	closeable={!data.branchWizardState?.value?.notClosable}
	onOpenChange={async (open) => {
		if (!open) {
			// Reset all wizard data when closing

			const branch = data.branchesState.getActiveBranch();
			if (branch?.onboardingStep) {
				data.branchesState.setActiveBranch(0);
				await organization.setActive({
					organizationId: data.branches[0].id
				});
			}
		}
	}}
>
	{#if value == 'welcome'}
		<div
			class="relative flex min-h-screen w-full items-center justify-center"
			style="background-color: hsl(var(--background));"
		>
			<div class="flex items-center justify-center">
				<!-- Wierd AF person :) -->
				<!-- <div class="relative">
					<img src="/person/person.png" alt="" class="h-147.5" />
					<img
						src="/person/hand.png"
						alt=""
						class="wave-hand absolute right-[92.5px] top-37 h-17.5"
						style="transform-origin: bottom center;"
					/>
				</div> -->
				<div>
					<!-- Inline SVG instead of <img> for blob1, so fill works -->
					<div
						class="absolute top-[0%] left-0 -z-10 size-125 -translate-x-1/2 -translate-y-1/6"
						style={`
					background-color: ${colors[0]};
					-webkit-mask: url('/blobs/blob1.svg') no-repeat center / cover;
					mask: url('/blobs/blob1.svg') no-repeat center / cover;
				`}
						aria-label="blob1"
					></div>
					<!-- Decorative blobs for welcome screen -->
					<div
						class="absolute top-0 right-0 -z-10 size-87.5 translate-x-1/2 -translate-y-1/3"
						style={`
					background-color: ${colors[1]};
					-webkit-mask: url('/blobs/blob2.svg') no-repeat center / cover;
					mask: url('/blobs/blob2.svg') no-repeat center / cover;
				`}
						aria-label="blob2"
					></div>
					<div
						class=" absolute bottom-0 left-0 -z-10 size-87.5 -translate-x-1/3 translate-y-1/2 rotate-[145deg]"
						style={`
					background-color: ${colors[2]};
					-webkit-mask: url('/blobs/blob3.svg') no-repeat center / cover;
					mask: url('/blobs/blob3.svg') no-repeat center / cover;
				`}
						aria-label="blob3"
					></div>
					<div
						class="absolute right-0 bottom-0 -z-10 size-50 translate-x-1/3 translate-y-1/4 rotate-[90deg]"
						style={`
					background-color: ${colors[3]};
					-webkit-mask: url('/blobs/blob4.svg') no-repeat center / cover;
					mask: url('/blobs/blob4.svg') no-repeat center / cover;
				`}
						aria-label="blob4"
					></div>
					<div
						class="absolute bottom-0 left-0 -z-10 size-45 translate-x-[45%] -translate-y-[25%] -rotate-45"
						style={`
					background-color: ${colors[4]};
					-webkit-mask: url('/blobs/blob5.svg') no-repeat center / cover;
					mask: url('/blobs/blob5.svg') no-repeat center / cover;
				`}
						aria-label="blob5"
					></div>
					<div
						class="mx-auto flex w-full max-w-md flex-col items-center space-y-8 px-6 text-center"
					>
						<!-- Logo/Brand area -->
						<div class="space-y-4">
							<img
								alt="Salora Logo"
								src="/logos/logo-square.svg"
								class="mx-auto flex h-24 w-24 items-center justify-center rounded-xl bg-[#65b4d8] shadow-lg"
							/>
						</div>

						<!-- Main content -->
						<div class=" relative space-y-6 text-gray-700">
							<div class="space-y-3">
								<h1 class="text-4xl leading-tight font-light">
									Welkom bij
									<span class="font-bold text-black">Salora!</span>
									<span class="relative">
										<div class="absolute top-4 right-3.75">
											<Confetti cone delay={[800, 1300]} x={[0, 1.5]} y={[0.25, 0.8]} />
										</div>
										<span class="shake inline-block"> 🎉 </span>
									</span>
								</h1>
								<h2 class="text-2xl text-gray-600">
									Laten we samen je eerste <br />vestiging opzetten
								</h2>
							</div>
						</div>

						<!-- Action buttons -->
						<div class="w-full space-y-3">
							<Button
								class="h-12 w-full text-base font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
								onclick={async () => {
									if (nextStep) {
										await nextStep();
									}
								}}
							>
								Laten we beginnen!
							</Button>

							<p class="text-center text-xs text-gray-400">Duurt slechts een paar minuten</p>
						</div>

						<!-- Footer text -->
						<div class="space-y-2 text-center">
							<p class="text-muted-foreground text-xs">
								Door verder te gaan ga je akkoord met onze
								<a href="/algemene-voorwaarden" class="text-primary hover:underline">Voorwaarden</a>
								& <a href="/privacy" class="text-primary hover:underline">Privacy</a>
							</p>
							<p class="text-xs text-gray-400">
								Salora - Simpel afspraken beheer voor jouw bedrijf ❤️
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else if wizardInputs[value]}
		{#if value == 'company'}
			<div>
				<h2 class="text-2xl font-semibold">Bedrijfsgegevens</h2>
				<p class="text-muted-foreground max-w-150 text-sm">
					Vul hier de gegevens van uw bedrijf in.
				</p>
				<Separator class="my-4" />
				<div class=" mb-8 flex flex-col">
					<h3 class="text-md font-semibold">
						{wizardInputs.company[0].title}
					</h3>
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

							try {
								loading.branchLogo = true;

								// Client-side image compression function

								// Compress the image and get data URL
								const compressedDataUrl = await compressImage(file);
								console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
								console.log(
									`Compressed size: ${((compressedDataUrl.size * (3 / 4)) / 1024 / 1024).toFixed(2)}MB`
								);
								// Save the compressed image data URL to company[0].value so parse file as blob
								wizardInputs.company[0].value = URL.createObjectURL(
									new Blob([compressedDataUrl], { type: 'image/jpeg' })
								);

								toast.success('Afbeelding succesvol toegevoegd');
							} catch (error) {
								console.error('Error processing image:', error);
								toast.error('Fout bij het verwerken van de afbeelding');
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
							<Avatar.Image src={wizardInputs.company[0].value as string} alt="Company logo" />
							<Avatar.Fallback>
								<img src="/images/placeholder-small.svg" alt="" />
							</Avatar.Fallback>
						</Avatar.Root>
					</button>
				</div>
			</div>
		{/if}
		{#each wizardInputs[value].slice(1) as input, i}
			<div class="mb-6">
				<h3 class="text-md font-semibold">
					{input.title}
					{#if input.required}
						<span class="text-red-500">*</span>
					{/if}

					{#if input.description && typeof input.description === 'function' && input.description()}
						<span class="mb-1 text-sm text-gray-500">({input.description()})</span>
					{/if}
				</h3>
				{#if input.description && typeof input.description === 'string'}
					<p class="mb-1 text-sm text-gray-500">{input.description}</p>
				{/if}
				<Input
					placeholder={input.placeholder}
					disabled={input.loading}
					bind:value={input.value}
					class={` h-10 max-w-130`}
				/>
			</div>
		{/each}
	{/if}

	{#if value == 'opening-hours'}
		<div>
			<h2 class="text-2xl font-semibold">Openingstijden</h2>
			<p class="text-muted-foreground max-w-150 text-sm">
				Stel hier de openingstijden van uw bedrijf in.
			</p>
			<Separator class="my-4" />
			<div in:slide={{ duration: 300, easing: cubicOut }}>
				<TimeSlotScheduler
					bind:schedules={businessHours}
					ondelete={(schedule) => {
						if (schedule.id) pendingDeletion = [...pendingDeletion, schedule.id];
					}}
				/>
			</div>
		</div>
	{:else if value == 'products'}
		<div>
			<div class="flex justify-between gap-2">
				<div>
					<h2 class="text-2xl font-semibold">Producten</h2>
					<p class="text-muted-foreground max-w-150 text-sm">
						Voeg je diensten toe om ze te verkopen aan je klanten.
					</p>
				</div>
			</div>
			<Separator class="my-4" />
			<div in:slide={{ duration: 300, easing: cubicOut }}>
				<Products variant="no-card" {data} />
			</div>
		</div>
	{:else if value == 'employees'}
		<div>
			<div class="flex justify-between gap-2">
				<div>
					<h2 class="text-2xl font-semibold">Medewerkers</h2>
					<p class="text-muted-foreground max-w-150 text-sm">
						Voeg medewerkers toe om je bedrijf te helpen runnen.
					</p>
				</div>
				<Button onclick={newEmployee}>
					<Plus />
					<p>
						Medewerker
						<span class="hidden md:inline"> toevoegen </span>
					</p>
				</Button>
			</div>
			<Separator class="my-4" />
			<div class="mt-4 grid grid-cols-1 gap-4" in:slide={{ duration: 300, easing: cubicOut }}>
				{#if activeBranch}
					<div>
						<Employees variant="small" bind:newEmployee employees={activeBranch.members} {data} />
					</div>
				{/if}
			</div>
		</div>
	{:else if value == 'smtp'}
		<div>
			<h2 class="text-2xl font-semibold">SMTP instellingen</h2>
			<p class="text-muted-foreground max-w-150 text-sm">
				Stel hier de SMTP instellingen in om e-mails te kunnen versturen vanuit je eigen domein.
				Deze stap is optioneel - als je dit overslaat, worden e-mails verstuurd vanuit ons systeem.
			</p>
			<Separator class="my-4" />
			<div in:slide={{ duration: 300, easing: cubicOut }}>
				{#if !smtpValues.loading}
					<div
						class="width block max-w-[calc(650px-1rem)] grid-cols-[70%_30%] items-end gap-4 sm:grid"
					>
						<div>
							<h3 class="text-md font-semibold">SMTP-server</h3>
							<span class="mb-1 text-sm text-gray-500">
								De hostnaam van de SMTP-server die u wilt gebruiken om e-mails te verzenden.
							</span>
							<div class="mt-1 flex items-center gap-2">
								<Input
									disabled={smtpValues.loading}
									class="h-10 max-w-162.5"
									bind:value={smtpValues.smtpServer}
									placeholder="bijv. smtp.gmail.com"
								/>
							</div>
						</div>
						<div>
							<h3 class="text-md mt-6 font-semibold">SMTP-poort</h3>
							<span class="mb-1 text-sm text-gray-500"> Meestal 587 (TLS) of 465 (SSL). </span>
							<div class="mt-1 flex items-center gap-2">
								<Input
									disabled={smtpValues.loading}
									class="h-10 max-w-162.5"
									bind:value={smtpValues.smtpPort}
									placeholder="587"
									type="number"
								/>
							</div>
						</div>
					</div>

					<h3 class="text-md mt-6 font-semibold">SMTP e-mailadres</h3>
					<span class="mb-1 text-sm text-gray-500">
						Het e-mailadres dat wordt gebruikt als afzender voor SMTP e-mails.
					</span>
					<div class="mt-1 flex items-center gap-2">
						<Input
							disabled={smtpValues.loading}
							class="h-10 max-w-162.5"
							bind:value={smtpValues.smtpEmail}
							placeholder="noreply@uwbedrijf.nl"
							type="email"
						/>
					</div>

					<h3 class="text-md mt-6 font-semibold">SMTP-gebruikersnaam</h3>
					<span class="mb-1 text-sm text-gray-500">
						De gebruikersnaam die wordt gebruikt om in te loggen op de SMTP-server.
					</span>
					<div class="mt-1 flex items-center gap-2">
						<Input
							disabled={smtpValues.loading}
							class="h-10 max-w-162.5"
							bind:value={smtpValues.smtpUsername}
							placeholder="Voer gebruikersnaam in"
						/>
					</div>

					<h3 class="text-md mt-6 font-semibold">SMTP-wachtwoord</h3>
					<span class="mb-1 text-sm text-gray-500">
						Het wachtwoord dat wordt gebruikt om in te loggen op de SMTP-server.
					</span>
					<div class="mt-1 flex items-center gap-2">
						<PasswordInput
							disabled={smtpValues.loading}
							class="h-10 max-w-162.5"
							bind:value={smtpValues.smtpPassword}
							placeholder="Voer wachtwoord in"
						/>
					</div>

					<div class="bg-muted mt-6 rounded-lg p-4">
						<p class="text-muted-foreground text-sm">
							<strong>Let op:</strong> Deze instellingen zijn optioneel. Als je deze velden leeg laat,
							worden e-mails verstuurd vanuit ons systeem. Als je één veld invult, moeten alle velden
							worden ingevuld.
						</p>
					</div>
				{:else}
					<div class="flex h-32 w-full items-center justify-center">
						<LoaderCircle class="text-muted-foreground h-8 w-8 animate-spin" />
					</div>
				{/if}
			</div>
		</div>
	{/if}
</ConfigWizard>

<!-- Employee Form Sheet -->
<Sheet.Root bind:open={employeeValues.sheet.active}>
	<Sheet.Content side="right" class="w-full sm:w-162.5">
		<div>
			<Sheet.Header>
				<Sheet.Title>Medewerker toevoegen</Sheet.Title>
				<Sheet.Description>
					Vul de gegevens in om een nieuw medewerker toe te voegen
				</Sheet.Description>
			</Sheet.Header>
			<ScrollArea class="h-[calc(100vh-56px-7rem)] max-w-full rounded-md px-3">
				<div class="grid gap-4 py-4">
					<div class="flex w-full flex-col items-center justify-center gap-4">
						<img src="/images/user.svg" alt="User" class="rounded-3.75 h-25 w-25" />
						<h1 class="text-lg" class:font-semibold={employeeValues.name}>
							{employeeValues.name || 'Naam van de medewerker'}
						</h1>
					</div>
					<div class="flex justify-between gap-2">
						<SettingsInput
							title="Naam"
							type="input"
							class="w-full"
							required
							bind:value={employeeValues.name}
						/>
						<SettingsInput
							title="E-mail"
							type="input"
							class="w-full"
							required
							bind:value={employeeValues.email}
						/>
					</div>
					<div>
						<h3 class="text-md font-semibold">
							Rol
							<span class="text-red-500">*</span>
						</h3>
						<Select.Root type="single" bind:value={employeeValues.role}>
							<Select.Trigger class="w-full">
								<div class="flex flex-wrap gap-2">
									<h2>
										{t.roles[employeeValues.role as keyof typeof t.roles] || 'Selecteer een rol'}
									</h2>
								</div>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="member">{t.roles.member}</Select.Item>
								<Select.Item value="admin">{t.roles.admin}</Select.Item>
								<Select.Item value="owner">{t.roles.owner}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</ScrollArea>
		</div>
		<Sheet.Footer>
			<Button
				disabled={employeeValues.sheet.loading || !employeeValues.name || !employeeValues.email}
				onclick={saveEmployee}
			>
				{#if employeeValues.sheet.loading}
					<LoaderCircle class="mr-2 animate-spin" size="16" />
				{/if}
				Toevoegen
			</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

<style>
	@keyframes shake {
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-8deg);
		}
		40% {
			transform: rotate(8deg);
		}
		60% {
			transform: rotate(-8deg);
		}
		80% {
			transform: rotate(8deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}
	.shake {
		animation: shake 1s;
		animation-delay: 800ms;
	}

	@keyframes wave {
		0% {
			transform: rotate(25deg);
		}
		50% {
			transform: rotate(45deg);
		}
		100% {
			transform: rotate(25deg);
		}
	}
	.wave-hand {
		animation: wave 1.5s ease-in-out 3;
		transform: rotate(25deg);
	}
</style>
