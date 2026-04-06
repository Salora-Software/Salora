<script lang="ts">
	import { renderEmail, AppointmentEmailSchema } from '@salora/emails';
	import {
		getAllowedTemplateVariablePaths,
		validateTemplateRecordVariables,
		validateTemplateVariables,
		type TemplateVariableAudience
	} from '@salora/emails';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { EmailPreview } from '$lib/components/ui/email-preview';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Loader } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { trpc, trpcQuery } from '$lib/trpc';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { page } from '$app/state';

	let { data } = $props();
	const target = $derived(page.params.target);
	const templateId = $derived(page.params.id);
	const organizationId = $derived(data.branchesState.getActiveBranch()?.id);

	let loading = $state(false);
	let subject = $state('');
	let formValues = $state<Record<string, string>>({});
	let enabled = $state(false);
	let testEmail = $state('');
	let openTestEmail = $state(false);
	let variableWarnings = $state<string[]>([]);

	const templateNames: Record<string, string> = {
		EMAIL_APPROVED: 'Afspraak bevestigd',
		EMAIL_CANCELED: 'Afspraak geannuleerd',
		EMAIL_CREATED: 'Afspraak gemaakt'
	};

	// Use the same queryKey as the layout → shares the tanstack cache, no extra HTTP request
	const templatesQuery = $derived(
		trpcQuery.v1.authenticated.communication.getTemplates.createQuery(
			{ organizationId },
			{
				queryKey: ['notificationTemplates', organizationId],
				enabled: !!organizationId
			}
		)
	);

	const loadingTemplate = $derived(templatesQuery.isLoading);

	// Derive the active template from the shared query data
	const currentTemplate = $derived(
		templatesQuery.data?.find((t: any) => t.type === templateId && t.target === target)
	);

	// Populate form whenever the template or route params change
	$effect(() => {
		// Track reactive dependencies
		const _target = target;
		const _templateId = templateId;
		const _template = currentTemplate;

		if (templatesQuery.isLoading) return;

		const initialValues: Record<string, string> = {};
		Object.entries(AppointmentEmailSchema).forEach(([key, config]) => {
			initialValues[key] = (config as any).defaultValue || '';
		});

		if (_template) {
			enabled = _template.enabled;
			subject = _template.subject || '';
			try {
				const parsedBody = JSON.parse(_template.body || '{}');
				Object.keys(initialValues).forEach((key) => {
					if (parsedBody[key]) initialValues[key] = parsedBody[key];
				});
			} catch (e) {
				if (_template.body && initialValues.content !== undefined) {
					initialValues.content = _template.body;
				}
			}
		} else {
			enabled = false;
			subject = '';
		}

		formValues = initialValues;
	});

	const mailProps = $derived({
		...formValues,
		editable: false
	});

	let renderedMailHtml = $state('');
	let renderPending = $state(false);

	$effect(() => {
		renderPending = true;
		const props = mailProps;
		(async () => {
			try {
				renderedMailHtml = await renderEmail('AppointmentEmail', props as any);
			} finally {
				renderPending = false;
			}
		})();
	});

	const allowedVariablePaths = $derived(
		getAllowedTemplateVariablePaths((target as TemplateVariableAudience) || 'CUSTOMER')
	);

	const placeholderExamples = $derived(allowedVariablePaths.slice(0, 6));

	$effect(() => {
		const subjectValidation = validateTemplateVariables(subject, allowedVariablePaths);
		const bodyValidation = validateTemplateRecordVariables(formValues, allowedVariablePaths);
		const unknown = [...new Set([...subjectValidation.unknown, ...bodyValidation.unknown])];
		variableWarnings = unknown.map(
			(path) =>
				`Onbekende variabele: {{ ${path} }}. Gebruik dot-path variabelen zoals {{ customer.name }}.`
		);
	});

	async function handleSave() {
		loading = true;
		try {
			if (variableWarnings.length > 0) {
				toast.warning('Template opgeslagen met waarschuwingen over onbekende variabelen');
			}

			const result = await trpc.v1.authenticated.communication.upsertTemplate.mutate({
				type: templateId!,
				subject,
				body: JSON.stringify(formValues),
				target: target as any
			});

			if (Array.isArray(result?.warnings) && result.warnings.length > 0) {
				result.warnings.forEach((warning: string) => toast.warning(warning));
			}

			toast.success('Template is succesvol bijgewerkt');
			// Invalidate shared query → layout sidebar + page both refresh
			await data.queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
		} finally {
			loading = false;
		}
	}

	async function toggleStatus(e: boolean) {
		try {
			await trpc.v1.authenticated.communication.updateTemplateStatus.mutate({
				type: templateId!,
				target: target as any,
				enabled: e
			});
			enabled = e;
			toast.success(enabled ? 'Melding ingeschakeld' : 'Melding uitgeschakeld');
			// Invalidate shared query → sidebar dots update immediately
			await data.queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
		} catch {
			enabled = !e;
		}
	}
</script>

<AlertDialog.Root bind:open={openTestEmail}>
	<AlertDialog.Content>
		<form
			onsubmit={async (e) => {
				e.preventDefault();
				loading = true;
				try {
					await trpc.v1.authenticated.communication.sendTestEmail.mutate({
						subject,
						body: renderedMailHtml,
						email: testEmail
					});
					toast.success('Test e-mail is succesvol verzonden');
					openTestEmail = false;
				} catch (error) {
					toast.error('Er is een fout opgetreden bij het verzenden van de test e-mail');
				} finally {
					loading = false;
				}
			}}
		>
			<AlertDialog.Header>
				<AlertDialog.Title>Naar welke e-mail wilt u deze test verzenden?</AlertDialog.Title>
				<AlertDialog.Description>
					<Input
						class="mt-2 w-full"
						placeholder="Voer een e-mailadres in"
						type="email"
						name="email"
						bind:value={testEmail}
						autocomplete="email"
						disabled={loading}
					/>
					<p class="text-muted-foreground mt-2 text-sm">
						Deze e-mail wordt alleen gebruikt voor de test en wordt niet opgeslagen.
					</p>
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={loading} type="button">Cancel</AlertDialog.Cancel>
				<AlertDialog.Action disabled={loading} type="submit">
					{#if loading}
						<Loader class="animate-spin" />
					{:else}
						Stuur Test E-mail
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<div class="flex h-full flex-col space-y-6">
	<!-- Header with Title and Actions -->
	<div class="flex items-center justify-between border-b pb-4">
		<div class="space-y-1">
			<h3 class="text-lg leading-6 font-medium">
				{templateId ? templateNames[templateId] : templateId}
			</h3>
			<p class="text-muted-foreground text-sm">
				Pas de inhoud en instellingen van deze melding aan voor {target === 'CUSTOMER'
					? 'klanten'
					: 'medewerkers'}.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					testEmail = '';
					openTestEmail = true;
				}}
				disabled={loading}
			>
				{#if loading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Test E-mail
			</Button>
			<Button size="sm" onclick={handleSave} disabled={loading}>
				{#if loading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Opslaan
			</Button>
		</div>
	</div>

	<!-- Split View -->
	<div class="grid min-h-0 grid-cols-2 gap-6">
		<!-- Left Column: Settings & Input -->
		<div class="flex w-full flex-col gap-6 overflow-y-auto pr-2">
			<div class="bg-card flex items-center space-x-2 rounded-md border p-4">
				<Switch id="notification-active" checked={enabled} onCheckedChange={toggleStatus} />
				<div class="grid gap-1.5 leading-none">
					<Label for="notification-active" class="cursor-pointer font-medium">
						{enabled ? 'Actief' : 'Inactief'}
					</Label>
					<p class="text-muted-foreground text-xs">
						Schakel deze notificatie in of uit voor {target === 'CUSTOMER'
							? 'klanten'
							: 'medewerkers'}.
					</p>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="subject">Onderwerp <span class="text-red-500">*</span></Label>
				{#if loadingTemplate}
					<Skeleton class="h-10 w-full" />
				{:else}
					<Input id="subject" bind:value={subject} placeholder="Voer het onderwerp in" />
				{/if}
			</div>

			{#each Object.entries(AppointmentEmailSchema) as [key, config]}
				<div
					class="space-y-2 {config.type === 'editor' ? 'flex min-h-[300px] flex-1 flex-col' : ''}"
				>
					<Label for={key}>{config.label}</Label>
					{#if loadingTemplate}
						<Skeleton class="h-10 w-full {config.type === 'editor' ? 'flex-1' : ''}" />
					{:else if config.type === 'text'}
						<Input id={key} bind:value={formValues[key]} placeholder={config.label} />
					{:else if config.type === 'editor'}
						<Textarea
							id={key}
							bind:value={formValues[key]}
							class="flex-1 resize-none font-mono text-sm"
							placeholder={`Typ hier de ${config.label.toLowerCase()}...`}
						/>
					{/if}
				</div>
			{/each}

			<p class="text-muted-foreground text-xs">
				Gebruik dot-path variabelen zoals {#each placeholderExamples as path, index}{'{{ ' + path + ' }}'}
					{index < placeholderExamples.length - 1 ? ', ' : '.'}
				{/each}
			</p>

			{#if variableWarnings.length > 0}
				<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
					{#each variableWarnings as warning}
						<p>{warning}</p>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right Column: Preview -->
		<div class="flex min-h-0 w-full flex-col space-y-2 overflow-y-auto">
			<h3 class="text-sm font-medium">Live Preview</h3>
			<div class="flex-1 overflow-hidden rounded-md border bg-white shadow-sm">
				{#if loadingTemplate}
					<Skeleton class="h-full w-full" />
				{:else}
					<div class="max-h-full min-h-0 overflow-y-auto">
						<EmailPreview html={renderedMailHtml} {subject} loading={renderPending} />
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
