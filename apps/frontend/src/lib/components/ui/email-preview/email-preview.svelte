<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		html = '',
		subject = '',
		fromName = 'Salora Boekingen',
		fromEmail = 'preview@example.com',
		toName = 'Klant',
		loading = false,
		class: className = ''
	}: {
		html?: string;
		subject?: string;
		fromName?: string;
		fromEmail?: string;
		toName?: string;
		loading?: boolean;
		class?: string;
	} = $props();

	function shadowAction(node: HTMLElement, content: string) {
		const root = node.shadowRoot || node.attachShadow({ mode: 'open' });
		root.innerHTML = content;
		return {
			update(newContent: string) {
				root.innerHTML = newContent;
			}
		};
	}
</script>

<div
	class={cn('flex flex-col overflow-hidden rounded-lg border shadow-sm transition-all', className)}
>
	<!-- Email Header -->
	<div class="border-b p-4">
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div
					class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
				>
					{fromName.substring(0, 2).toUpperCase()}
				</div>
				<div>
					<div class="text-sm font-semibold">{fromName}</div>
					<div class="text-muted-foreground text-xs">{fromEmail}</div>
				</div>
			</div>
			<div class="text-muted-foreground text-sm">Vandaag</div>
		</div>
		<div class="mt-4 space-y-1">
			<div class="text-sm font-medium">
				<span class="text-muted-foreground font-normal">Aan:</span>
				{toName}
			</div>
			<div class="text-sm font-medium">
				<span class="text-muted-foreground font-normal">Onderwerp:</span>
				{subject || '(Geen onderwerp)'}
			</div>
		</div>
	</div>
	<!-- Email Content -->
	{#if loading && !html}
		<div
			class="bg-muted text-muted-foreground h-fill flex min-h-128 w-full items-center justify-center text-sm italic"
		>
			Loading preview...
		</div>
	{:else}
		<div class="w-full overflow-auto" use:shadowAction={html}></div>
	{/if}
</div>
