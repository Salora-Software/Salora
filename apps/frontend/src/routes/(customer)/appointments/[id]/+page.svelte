<script lang="ts">
	function handleSubmit(event: Event) {
		event.preventDefault();
		resendVerification();
	}
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator/index';
	import { ChevronLeft } from '@lucide/svelte';
	import { language, t, translations } from '$lib/translation';
	import { DateTime } from 'luxon';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { trpc } from '$lib/trpc.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { magicLink, signIn } from '$lib/auth-client.js';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	// State for resend verification email
	let resendEmail = $state(page.url.searchParams.get('email') || ''); // Get email from URL if available
	let resendStatus = $state<'idle' | 'success' | 'error'>('idle');

	const isDesktop = new MediaQuery('(min-width: 768px)');
	let { data } = $props();
	let branch = $derived(data.branch);
	let error = $derived(data.error);

	// svelte-ignore state_referenced_locally
	const TIMEZONE = branch?.timeZone || 'Europe/Amsterdam';

	// Date/time formats for EN/NL
	const DATE_FORMATS = {
		en: {
			date: 'dd LLLL yyyy', // e.g. 17 July 2025
			time: 'HH:mm'
		},
		nl: {
			date: 'dd LLLL yyyy', // e.g. 17 juli 2025
			time: 'HH:mm'
		}
	} as const;

	type Lang = keyof typeof DATE_FORMATS;
	function getFormats(lang: string) {
		return DATE_FORMATS[lang as Lang] || DATE_FORMATS.en;
	}

	// State for cancel dialog/drawer
	let cancelDialog = $state({
		open: false,
		appt: null as Appointment | null,
		loading: false,
		error: ''
	});

	type AppointmentStatus = 'Upcoming' | 'COMPLETED' | 'CANCELLED';
	interface Appointment {
		id: string;
		service: string;
		assigned: string;
		status: AppointmentStatus;
		date: DateTime<boolean>;
		canReview: boolean;
		duration: number; // duration in minutes
		isPast?: boolean;
	}

	let appointments: Appointment[] = $state([]);

	// svelte-ignore state_referenced_locally
	let activeTab = $state('Upcoming');
	let loading = $state(true);
	const cancelId = page.url.searchParams.get('cancel');

	async function resendVerification() {
		resendStatus = 'idle';
		if (!resendEmail || !resendEmail.includes('@') || !branch?.id) {
			resendStatus = 'error';
			return;
		}
		// Replace with actual trpc or API call
		const { data, error } = await signIn.magicLink({
			email: resendEmail,
			callbackURL: `/appointments/${branch.id}`
		});
		if (error) resendStatus = 'error';
		else resendStatus = 'success';
	}
	onMount(() => {
		(async () => {
			if (error || !branch?.id) {
				return;
			}
			const response = (await trpc.appointment.getAppointments.query({
				branchId: branch.id
			})) as any[];
			const now = DateTime.now();
			appointments = response.map((a: any) => {
				const status = a.booking?.status || 'Upcoming';
				const endTime = DateTime.fromJSDate(a.endTime);
				// If appointment has ended, mark as COMPLETED
				const finalStatus =
					endTime < now && status !== 'CANCELLED' ? 'COMPLETED' : (status as AppointmentStatus);
				return {
					id: a.id,
					service: a.booking?.service?.name || '',
					assigned: a.booking?.employee?.user?.name || '',
					status: finalStatus,
					date: DateTime.fromJSDate(a.startTime).setZone(TIMEZONE),
					canReview: finalStatus === 'COMPLETED',
					duration: a.booking?.duration || 0,
					isPast: endTime < now
				};
			});
			activeTab = appointments.some((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
				? 'Upcoming'
				: appointments.some((a) => a.status === 'COMPLETED')
					? 'COMPLETED'
					: 'CANCELLED';
			loading = false;
			if (cancelId) {
				const appt = appointments.find((a) => a.id === cancelId);
				if (appt) {
					cancelDialog.open = true;
					cancelDialog.appt = appt;
				}
			}
		})();
	});
</script>

{#if error}
	{#if error === 'UNAUTHORIZED'}
		<div class="bg-background flex min-h-screen flex-col items-center justify-center">
			<div
				class="bg-card border-border w-full max-w-md rounded-2xl border p-8 text-center shadow-lg"
			>
				<h1 class="text-foreground mb-4 text-2xl font-bold">{t.errors.expired_link_title}</h1>
				<p class="text-muted-foreground mb-6">{t.errors.expired_link_description}</p>
				<form class="flex flex-col gap-2" onsubmit={handleSubmit}>
					<Label class="text-muted-foreground text-sm" for="email"
						>{t.errors.resend_verification_label}</Label
					>
					<Input
						id="email"
						type="email"
						bind:value={resendEmail}
						class="border-border w-full rounded-lg border px-4 py-2 "
						placeholder="Email (bijv. example@salora.app)"
						required
					/>
					<div class="mt-2 grid grid-cols-[1fr_2fr] gap-2">
						<Button
							onclick={() => {
								history.back();
							}}
							variant="outline"
							class="w-full px-6">{t.errors.back_to_home}</Button
						>
						<Button type="submit" class="px-6">{t.errors.resend_verification_button}</Button>
					</div>
					{#if resendStatus === 'success'}
						<div class="text-sm text-green-600">{t.errors.resend_verification_success}</div>
					{:else if resendStatus === 'error'}
						<div class="text-destructive text-sm">{t.errors.resend_verification_error}</div>
					{/if}
				</form>
			</div>
		</div>
	{:else}
		{error}
		<div class="bg-background flex min-h-screen flex-col items-center justify-center">
			<div
				class="bg-card border-border w-full max-w-md rounded-2xl border p-8 text-center shadow-lg"
			>
				<h1 class="text-foreground mb-4 text-2xl font-bold">
					{t.errors.invalid_link_title}
				</h1>
				<p class="text-muted-foreground mb-6">{t.errors.invalid_link_description}</p>
				<Button
					onclick={() => {
						history.back();
					}}
					class="px-6">{t.errors.back_to_home}</Button
				>
			</div>
		</div>
	{/if}
{:else}
	{#if cancelDialog.open}
		{#if isDesktop.current}
			<Dialog.Root open={cancelDialog.open} onOpenChange={(v) => (cancelDialog.open = v)}>
				<Dialog.Content class="sm:max-w-106.25">
					<Dialog.Header>
						<Dialog.Title>{t.appointments.cancel_title}</Dialog.Title>
						<Dialog.Description>
							{#if !cancelDialog.appt}
								<!-- Skeleton loader for dialog description -->
								<Skeleton class="mb-2 h-4 w-3/4" />
								<Skeleton class="h-4 w-1/2" />
							{:else}
								{(() => {
									const formats = getFormats(language);
									const dateStr = cancelDialog.appt.date.setLocale(language).toFormat(formats.date);
									const timeStr = cancelDialog.appt.date.setLocale(language).toFormat(formats.time);
									return t.appointments.cancel_desc
										.replace('{company}', branch?.name || '')
										.replace('{service}', cancelDialog.appt.service)
										.replace('{staff}', cancelDialog.appt.assigned)
										.replace('{date}', dateStr)
										.replace('{time}', timeStr);
								})()}
							{/if}
						</Dialog.Description>
					</Dialog.Header>
					<div class="mt-4 flex flex-col gap-2">
						{#if !cancelDialog.appt}
							<Skeleton class="mb-2 h-10 w-full rounded-lg" />
							<Skeleton class="h-10 w-full rounded-lg" />
						{:else}
							<Button
								variant="destructive"
								disabled={cancelDialog.loading || cancelDialog.appt?.isPast}
								onclick={async () => {
									if (!cancelDialog.appt || !branch?.id) return;
									if (cancelDialog.appt.isPast) {
										cancelDialog.error = t.errors.default;
										return;
									}
									cancelDialog.loading = true;
									cancelDialog.error = '';
									try {
										await trpc.appointment.cancelAppointment.mutate({
											branchId: branch.id,
											appointmentId: cancelDialog.appt.id
										});
										// Update appointment status locally
										if (cancelDialog.appt) {
											appointments = appointments.map((a) =>
												a.id === cancelDialog.appt?.id ? { ...a, status: 'CANCELLED' } : a
											);
										}
										toast.success(t.appointments.canceled, {
											description: t.appointments.cancel_success
										});
										cancelDialog.open = false;
										cancelDialog.appt = null;
									} catch (e) {
										cancelDialog.error = t.errors.default;
										toast.error(t.errors.default, {
											description: t.appointments.cancel_error
										});
									} finally {
										cancelDialog.loading = false;
									}
								}}
							>
								{cancelDialog.loading ? 'Loading...' : t.appointments.cancel_confirm}
							</Button>
							<Dialog.Close>
								<Button
									variant="outline"
									class="w-full"
									onclick={() => (cancelDialog.open = false)}
								>
									{t.appointments.cancel_dismiss}
								</Button>
							</Dialog.Close>
						{/if}
					</div>
				</Dialog.Content>
			</Dialog.Root>
		{:else}
			<Drawer.Root open={cancelDialog.open} onOpenChange={(v) => (cancelDialog.open = v)}>
				<Drawer.Content>
					<div class="mx-auto w-full max-w-sm">
						<Drawer.Header>
							<Drawer.Title>{t.appointments.cancel_title}</Drawer.Title>
							<Drawer.Description>
								{#if !cancelDialog.appt}
									<Skeleton class="mb-2 h-4 w-3/4" />
									<Skeleton class="h-4 w-1/2" />
								{:else}
									{(() => {
										const formats = getFormats(language);
										const dateStr = cancelDialog.appt.date
											.setLocale(language)
											.toFormat(formats.date);
										const timeStr = cancelDialog.appt.date
											.setLocale(language)
											.toFormat(formats.time);
										return t.appointments.cancel_desc
											.replace('{company}', branch?.name || '')
											.replace('{service}', cancelDialog.appt.service)
											.replace('{staff}', cancelDialog.appt.assigned)
											.replace('{date}', dateStr)
											.replace('{time}', timeStr);
									})()}
								{/if}
							</Drawer.Description>
						</Drawer.Header>
						<Drawer.Footer>
							{#if !cancelDialog.appt}
								<Skeleton class="mb-2 h-10 w-full rounded-lg" />
								<Skeleton class="h-10 w-full rounded-lg" />
							{:else}
								<Button
									variant="destructive"
									disabled={cancelDialog.loading || cancelDialog.appt?.isPast}
									onclick={async () => {
										if (!cancelDialog.appt || !branch?.id) return;
										if (cancelDialog.appt.isPast) {
											cancelDialog.error = t.errors.default;
											return;
										}
										cancelDialog.loading = true;
										cancelDialog.error = '';
										try {
											await trpc.appointment.cancelAppointment.mutate({
												branchId: branch.id,
												appointmentId: cancelDialog.appt.id
											});
											// Update appointment status locally
											if (cancelDialog.appt) {
												appointments = appointments.map((a) =>
													a.id === cancelDialog.appt?.id ? { ...a, status: 'CANCELLED' } : a
												);
											}
											cancelDialog.open = false;
											cancelDialog.appt = null;
										} catch (e) {
											cancelDialog.error = 'Failed to cancel appointment.';
										} finally {
											cancelDialog.loading = false;
										}
									}}
								>
									{cancelDialog.loading ? 'Loading...' : t.appointments.cancel_confirm}
								</Button>
								<Drawer.Close class="w-full">
									<Button
										variant="outline"
										class="w-full"
										onclick={() => (cancelDialog.open = false)}
									>
										{t.appointments.cancel_dismiss}
									</Button>
								</Drawer.Close>
							{/if}
							{#if cancelDialog.error}
								<div class="text-destructive mt-2 text-sm">{cancelDialog.error}</div>
							{/if}
						</Drawer.Footer>
					</div>
				</Drawer.Content>
			</Drawer.Root>
		{/if}
	{/if}

	<div class="bg-background flex min-h-screen flex-col items-center">
		<!-- Top Bar -->
		<div class="my-6 flex w-full max-w-md items-center justify-between px-4 lg:max-w-2xl lg:px-0">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Go back"
				class="text-foreground"
				onclick={() => history.back()}
			>
				<ChevronLeft class="h-6 w-6" />
			</Button>
			<h1 class="text-foreground text-lg font-semibold">{t.appointments.my_appointment}</h1>
			<div class="h-6 w-6 p-5"></div>
		</div>

		<!-- Tabs or Skeleton Loading -->
		{#if loading}
			<div class="mb-6 w-full max-w-md px-2 lg:max-w-2xl lg:px-0">
				<!-- Tabs bar as skeletons -->
				<div class="bg-muted mb-6 flex w-full justify-between rounded-xl p-1 lg:gap-2 lg:p-2">
					<Skeleton class="mx-1 h-6 flex-1 rounded-xl" />
					<Skeleton class="mx-1 h-6 flex-1 rounded-xl" />
					<Skeleton class="mx-1 h-6 flex-1 rounded-xl" />
				</div>
				<div class="flex flex-col gap-4 lg:items-center lg:gap-6">
					{#each Array(3) as _, i}
						<div
							class="bg-card border-border mb-2 flex w-full flex-col gap-2 rounded-2xl border p-4 shadow-lg drop-shadow-md lg:gap-4 lg:p-8"
						>
							<div class="flex items-center gap-4">
								<Skeleton class="size-14 rounded-xl" />
								<div class="flex-1 space-y-2">
									<Skeleton class="h-5 w-32" />
									<Skeleton class="h-3 w-24" />
									<Skeleton class="h-3 w-28" />
								</div>
							</div>
							<Separator class="my-0" />
							<div class="grid w-full grid-cols-2 gap-2 lg:gap-4">
								<Skeleton class="h-10 w-full rounded-lg" />
								<Skeleton class="h-10 w-full rounded-lg" />
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<Tabs.Root
				value={activeTab}
				onValueChange={(v: string) => (activeTab = v)}
				class="mb-6 w-full max-w-md px-2 lg:max-w-2xl lg:px-0"
			>
				<Tabs.List class="bg-muted flex w-full justify-between rounded-xl p-1 lg:gap-2 lg:p-2">
					<Tabs.Trigger
						value="Upcoming"
						class="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 rounded-xl text-sm font-medium data-[state=active]:shadow"
						>{t.appointments.upcoming}</Tabs.Trigger
					>
					<Tabs.Trigger
						value="COMPLETED"
						class="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 rounded-xl text-sm font-medium data-[state=active]:shadow"
						>{t.appointments.completed}</Tabs.Trigger
					>
					<Tabs.Trigger
						value="CANCELLED"
						class="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 rounded-xl text-sm font-medium data-[state=active]:shadow"
						>{t.appointments.canceled}</Tabs.Trigger
					>
				</Tabs.List>
				<Tabs.Content value="Upcoming" class="pt-4">
					<div class="flex flex-col gap-4 lg:items-center lg:gap-6">
						{#if appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length === 0}
							<div class="text-muted-foreground flex flex-col gap-4 text-center">
								{t.appointments.no_upcoming}
							</div>
						{:else}
							{#each appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED') as appt}
								<div
									class="bg-card border-border mb-2 flex w-full flex-col gap-2 rounded-2xl border p-4 shadow-lg drop-shadow-md lg:gap-4 lg:p-8"
								>
									<div class="flex items-center gap-4">
										<img
											src={env.PUBLIC_CDN_URL + branch?.logo}
											alt={branch?.name}
											class="bg-muted h-14 w-14 rounded-xl object-cover"
										/>
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<span class="text-foreground text-base font-semibold">{branch?.name}</span>
											</div>
											<div class="text-muted-foreground text-xs">
												{appt.service} | {appt.assigned}
											</div>
											<div class="text-muted-foreground mt-1 text-xs">
												{(() => {
													const formats = getFormats(language);
													const start = appt.date.setLocale(language).toFormat(formats.time);
													const end = appt.date
														.plus({ minutes: appt.duration })
														.setLocale(language)
														.toFormat(formats.time);
													const dateStr = appt.date.setLocale(language).toFormat(formats.date);
													return `${start} - ${end} | ${dateStr}`;
												})()}
											</div>
										</div>
									</div>
									<Separator class="my-0" />
									<div class="grid w-full grid-cols-2 gap-2 lg:gap-4">
										<a
											href={branch?.website + '?book' || '#'}
											class="bg-muted text-muted-foreground border-border hover:bg-accent cursor-pointer rounded-lg border py-2 text-center text-sm font-medium transition"
											>{t.appointments.book_again}</a
										>
										<Button
											variant="destructive"
											disabled={appt.isPast}
											class="w-full rounded-lg py-2"
											onclick={() => {
												if (!appt.isPast) {
													cancelDialog.open = true;
													cancelDialog.appt = appt;
												}
											}}
										>
											{appt.isPast ? 'Voltooid' : t.appointments.cancel}
										</Button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</Tabs.Content>
				<Tabs.Content value="COMPLETED" class="pt-4">
					<div class="flex flex-col gap-4 lg:items-center lg:gap-6">
						{#if appointments.filter((a) => a.status === 'COMPLETED').length === 0}
							<div class="text-muted-foreground flex flex-col gap-4 text-center">
								{t.appointments.no_finished}
							</div>
						{:else}
							{#each appointments.filter((a) => a.status === 'COMPLETED') as appt}
								<div
									class="bg-card border-border mb-2 flex w-full flex-col gap-2 rounded-2xl border p-4 shadow-lg drop-shadow-md lg:gap-4 lg:p-8"
								>
									<div class="flex items-center gap-4">
										<img
											src={env.PUBLIC_CDN_URL + branch?.logo}
											alt={branch?.name}
											class="bg-muted h-14 w-14 rounded-xl object-cover"
										/>
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<span class="text-foreground text-base font-semibold">{branch?.name}</span>
												{#if appt.status === 'COMPLETED'}
													<span
														class="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-500 dark:bg-green-900 dark:text-green-200"
														>{t.appointments.completed}</span
													>
												{/if}
											</div>
											<div class="text-muted-foreground text-xs">
												{appt.service} | {appt.assigned}
											</div>
											<div class="text-muted-foreground mt-1 text-xs">
												{(() => {
													const formats = getFormats(language);
													const start = appt.date.setLocale(language).toFormat(formats.time);
													const end = appt.date
														.plus({ minutes: appt.duration })
														.setLocale(language)
														.toFormat(formats.time);
													const dateStr = appt.date.setLocale(language).toFormat(formats.date);
													return `${start} - ${end} | ${dateStr}`;
												})()}
											</div>
										</div>
									</div>
									<Separator class="my-0" />
									<div class="grid w-full grid-cols-2 gap-2 lg:gap-4">
										<a
											href={branch?.website + '?book' || '#'}
											class="bg-muted text-muted-foreground border-border hover:bg-accent cursor-pointer rounded-lg border py-2 text-center text-sm font-medium transition"
											>{t.appointments.book_again}</a
										>
										<Button
											variant="default"
											class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg py-2"
											disabled={!appt.canReview}>{t.appointments.leave_review}</Button
										>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</Tabs.Content>
				<Tabs.Content value="CANCELLED" class="pt-4">
					<div class="flex flex-col gap-4 lg:items-center lg:gap-6">
						{#if appointments.filter((a) => a.status === 'CANCELLED').length === 0}
							<div class="text-muted-foreground flex flex-col gap-4 text-center">
								{t.appointments.no_canceled}
							</div>
						{:else}
							{#each appointments.filter((a) => a.status === 'CANCELLED') as appt}
								<div
									class="bg-card border-border mb-2 flex w-full flex-col gap-2 rounded-2xl border p-4 shadow-lg drop-shadow-md lg:gap-4 lg:p-8"
								>
									<div class="flex items-center gap-4">
										<img
											src={env.PUBLIC_CDN_URL + branch?.logo}
											alt={branch?.name}
											class="bg-muted h-14 w-14 rounded-xl object-cover"
										/>
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<span class="text-foreground text-base font-semibold">{branch?.name}</span>
												{#if appt.status === 'CANCELLED'}
													<span
														class="ml-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-500 dark:bg-red-900 dark:text-red-200"
														>{t.appointments.canceled}</span
													>
												{/if}
											</div>
											<div class="text-muted-foreground text-xs">
												{appt.service} | {appt.assigned}
											</div>
											<div class="text-muted-foreground mt-1 text-xs">
												{(() => {
													const formats = getFormats(language);
													const start = appt.date.setLocale(language).toFormat(formats.time);
													const end = appt.date
														.plus({ minutes: appt.duration })
														.setLocale(language)
														.toFormat(formats.time);
													const dateStr = appt.date.setLocale(language).toFormat(formats.date);
													return `${start} - ${end} | ${dateStr}`;
												})()}
											</div>
										</div>
									</div>
									<Separator class="my-0" />
									<div class="grid w-full grid-cols-1 gap-2 lg:gap-4">
										<a
											href={branch?.website + '?book' || '#'}
											class="bg-muted text-muted-foreground border-border hover:bg-accent cursor-pointer rounded-lg border py-2 text-center text-sm font-medium transition"
											>{t.appointments.book_again}</a
										>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</Tabs.Content>
			</Tabs.Root>
		{/if}
	</div>
{/if}
