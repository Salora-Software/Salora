<script lang="ts">
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/state';
	import { afterNavigate, goto, onNavigate } from '$app/navigation';

	let { children, data } = $props();

	let breadcrumbPath = $derived(() => ['dashboard', ...page.url.pathname.split('/').slice(2)]);
	import { t } from '$lib/translation.js';
	import BranchWizard from '$lib/components/BranchWizard.svelte';
	import DarkToggle from '$lib/components/DarkToggle.svelte';
	import NotificationComponent from '$lib/components/NotificationComponent.svelte';
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';
	import { SquareArrowOutUpRight } from 'lucide-svelte';
	let open = $state(true);

	onNavigate(() => {
		data.branchesState.resetOnChangeCallbacks();
	});
</script>

<BranchWizard {data} />
<Sidebar.Provider bind:open>
	<AppSidebar {data} />
	<main class="grid h-full min-h-screen w-full grid-rows-[auto_1fr]">
		<div
			class="topHeader !bg-sidebar sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b px-4"
		>
			<div class="flex items-center gap-2">
				<Sidebar.Trigger />
				<Separator orientation="vertical" class=" h-5" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each breadcrumbPath() as item, i}
							{#if item !== breadcrumbPath()[breadcrumbPath().length - 1]}
								<Breadcrumb.Item>
									<Breadcrumb.Link href={i >= 1 ? '/' + item : '/'}>
										{t.pages[item as keyof typeof t.pages] || item}</Breadcrumb.Link
									>
								</Breadcrumb.Item>
								<Breadcrumb.Separator />
							{:else}
								<Breadcrumb.Item>
									<Breadcrumb.Page>{t.pages[item as keyof typeof t.pages] || item}</Breadcrumb.Page>
								</Breadcrumb.Item>
							{/if}
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
			<div class="flex items-center gap-2">
				<DarkToggle />
				<Button
					onclick={() =>
						window.open(
							`http://localhost:5174/popup/${data.branchesState.getActiveBranch()?.id}`,
							'_blank'
						)}
					variant="outline"
					size="icon-lg"
				>
					<SquareArrowOutUpRight />
				</Button>
				<NotificationComponent />
			</div>
		</div>
		<div class={cn('mx-auto w-full', !page.data.fullWidth ? 'max-w-400 px-4 py-2' : '')}>
			{@render children()}
		</div>
	</main>
</Sidebar.Provider>

<style>
	main {
		/* padding: 0.5rem 1rem; */
		width: 100%;
		/* width: 1600px;
		margin: 0 auto; */
	}
	.topHeader {
		background-color: hsl(var(--sidebar-background));
	}
</style>
