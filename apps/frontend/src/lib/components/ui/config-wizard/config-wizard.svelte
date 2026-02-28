<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index';
	import { cn } from '$lib/utils';
	import { Check, Cross, Loader, Plus } from 'lucide-svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';

	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		steps = $bindable([]),
		value = $bindable(''),
		closeable = $bindable(true),
		open = $bindable(true),
		fullscreen = false,
		title,
		description,
		onOpenChange,
		onNext = $bindable(null),
		...restProps
	}: {
		ref?: HTMLDivElement | null;
		open?: boolean;
		fullscreen?: boolean;
		title?: string;
		description?: string;
		steps?: {
			name: string;
			active?: boolean;
			completed?: boolean;
			id: string;
			onnext?: (() => Promise<boolean>) | (() => boolean);
		}[];
		class?: string;
		children?: () => any;
		closeable?: boolean;
		value?: string;
		onOpenChange?: (open: boolean) => void;
		onNext?: (() => Promise<void>) | null;
		[key: string]: any;
	} = $props();
	$effect(() => {
		if (steps) {
			value = steps.find((step) => step.active)?.id || '';
		}
	});
	function setActiveStep(id: string) {
		const indexOfActive = steps.findIndex((step) => step.id === id);
		steps = steps.map((s) => ({ ...s, completed: false }));
		steps = steps.map((s, index) => ({
			...s,
			active: s.id === id,
			completed: index < indexOfActive ? true : s.completed
		}));
	}

	async function handleNext() {
		const activeStep = steps.find((step) => step.active);
		const nextStep = steps.find((step) => step.name === activeStep?.name);
		const i = steps.findIndex((step) => step.name === nextStep?.name);
		if (nextStep?.onnext) {
			loading = true;
			let response;
			try {
				const result = nextStep.onnext();
				if (result instanceof Promise) {
					response = await result;
				} else {
					response = result;
				}
			} catch {
				loading = false;
				return;
			}
			loading = false;
			if (!response) return;
		}
		if (i === steps.length - 1) {
			open = false;
		} else {
			setActiveStep(steps[i + 1]?.id);
		}
	}

	// Expose the handleNext function
	$effect(() => {
		onNext = handleNext;
	});

	let loading = $state(false);
</script>

<Dialog.Root
	bind:open
	onOpenChange={() => {
		if (!open && !closeable) {
			open = true;
			return;
		}
		if (onOpenChange) onOpenChange(open);
	}}
	{...restProps}
>
	<Dialog.Content
		overlay={false}
		bind:ref
		class={cn(
			'z-20 block h-full w-screen! max-w-[unset]! rounded-none! p-0',
			fullscreen ? 'w-full' : 'sm:max-w-106.25',
			className
		)}
		closeButton={false}
	>
		{#if fullscreen}
			<!-- Fullscreen layout -->
			<div class="flex h-full w-full">
				<!-- Content area takes full width -->
				<div class="flex flex-1 items-center justify-center">
					<div class="w-full">
						{@render children?.()}
					</div>
				</div>
			</div>
		{:else}
			<!-- Regular layout -->
			<Dialog.Header class="m-auto flex w-full max-w-295 flex-row justify-between p-4 pb-0">
				<div class="mb-4 w-max">
					<Dialog.Title>
						{title}
					</Dialog.Title>
					<Dialog.Description>
						{description}
					</Dialog.Description>
				</div>
				{#if closeable}
					<div in:scale={{ duration: 300, delay: 200 }}>
						<Dialog.Close class="block h-5 w-5 cursor-pointer ">
							<Plus class="rotate-45" />
						</Dialog.Close>
					</div>
				{/if}
			</Dialog.Header>
			<ScrollArea class="h-[calc(100%-70px)] w-full rounded-md border">
				<div class="m-auto max-w-295 grid-cols-[1fr_auto_3fr] px-4 sm:grid">
					<div class="left-side relative hidden sm:block">
						<div class="sticky top-0 flex flex-col pt-4">
							{#each steps as step, i}
								<button
									class="flex items-center space-x-3 transition-all duration-200"
									class:cursor-not-allowed={!step.active && !step.completed}
									onclick={() => {
										if (step.completed) {
											setActiveStep(step.id);
										}
									}}
									in:fly={{ x: -20, duration: 300, delay: i * 100, easing: cubicOut }}
								>
									<div class="relative flex flex-col items-center">
										<!-- Step circle -->
										{#if step.completed}
											<div
												class="border-border bg-muted flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300"
												in:scale={{ duration: 300, easing: quintOut }}
											>
												<div in:scale={{ duration: 200, delay: 100 }}>
													<Check size="15" class="text-foreground" />
												</div>
											</div>
										{:else}
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300"
												class:border-primary={step.active}
												class:border-border={!step.active}
												class:bg-card={!step.active}
												class:scale-110={step.active}
											>
												<div
													class="h-3 w-3 rounded-full transition-all duration-300"
													class:bg-primary={step.active}
													class:bg-muted={!step.active}
													class:scale-110={step.active}
												></div>
											</div>
										{/if}

										<!-- Connector line -->
									</div>

									<!-- Step label -->
									<span
										class="text-foreground transition-all duration-200"
										class:font-semibold={step.active}>{step.name}</span
									>
								</button>

								{#if i < steps.length - 1}
									<div
										class="bg-border my-1 ml-[11.5px] h-6 w-0.5 transition-opacity duration-300"
										class:opacity-30={!step.completed && !step.active}
									></div>
								{/if}
							{/each}
						</div>
					</div>
					<Separator orientation="vertical" class="mx-20 hidden h-[100vh] sm:block" />
					<div class=" w-full pt-4">
						{@render children?.()}
						<Separator class="m-auto my-8 h-0.25" />
						<div class="flex w-full justify-end gap-4">
							{#if closeable}
								<Button
									variant="secondary"
									onclick={() => (open = false)}
									class="transition-all duration-200 ">Cancel</Button
								>
							{/if}
							<Button disabled={loading} onclick={handleNext} class="transition-all duration-200 ">
								{#if loading}
									<div in:scale={{ duration: 200 }}>
										<Loader class="animate-spin" />
									</div>
								{:else}
									<span in:fade={{ duration: 150 }}>
										{steps.findIndex((step) => step.active) === steps.length - 1
											? 'Voltooien'
											: 'Volgende'}
									</span>
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</ScrollArea>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.left-side::after {
		content: '';
		width: 100vw;
		height: 100%;
		position: absolute;
		top: 0;
		right: -5rem;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
		background-color: var(--muted);
		opacity: 0.04;
	}
</style>
