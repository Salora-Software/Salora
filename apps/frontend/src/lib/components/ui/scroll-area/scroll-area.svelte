<script lang="ts">
	import {
		ScrollArea as ScrollAreaPrimitive,
		type ScrollAreaViewportProps,
		type WithoutChild
	} from 'bits-ui';
	import { Scrollbar } from './index.js';
	import { cn } from '$lib/utils.js';
	import { onMount, type SvelteComponent } from 'svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { browser } from '$app/environment';
	import { navigating } from '$app/state';

	let refViewport: HTMLElement | null = $state(null);
	function scrollToPoint(x: number = 0, y: number = 0, behavior: 'smooth' | 'auto' = 'smooth') {
		if (refViewport) {
			refViewport.scrollTo({ top: y || 0, left: x || 0, behavior: behavior });
		}
	}
	let loaded = false;
	let {
		ref = $bindable(null),
		scrollToX = $bindable(),
		scrollToY = $bindable(),
		class: className,
		orientation = 'vertical',
		scrollbarXClasses = '',
		scrollbarYClasses = '',
		defaultScroll = { x: 0, y: 0 },
		children,
		...restProps
	}: WithoutChild<ScrollAreaPrimitive.RootProps> & {
		orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
		scrollToX?: number | undefined;
		scrollToY?: number | undefined;
		scrollbarXClasses?: string | undefined;
		scrollbarYClasses?: string | undefined;
		defaultScroll?: { x: number; y: number };
	} = $props();
	$effect(() => {
		if (refViewport && navigating.from) {
			scrollToPoint(defaultScroll.x, defaultScroll.y, 'auto');
		}
		if (scrollToX !== undefined || scrollToY !== undefined) {
			scrollToPoint(scrollToX, scrollToY);
			scrollToX = undefined;
			scrollToY = undefined;
		}
	});
	onMount(() => {
		if (browser) {
			scrollToPoint(defaultScroll.x, defaultScroll.y, 'auto');
		}
		loaded = true;
	});
</script>

<ScrollAreaPrimitive.Root bind:ref {...restProps} class={cn('relative overflow-hidden', className)}>
	<ScrollAreaPrimitive.Viewport
		bind:ref={refViewport}
		class="h-full w-full rounded-[inherit]"
		id="scroll-area-viewport"
		onscroll={(e) => restProps.onscroll?.(e)}
	>
		{@render children?.()}
	</ScrollAreaPrimitive.Viewport>
	{#if orientation === 'vertical' || orientation === 'both'}
		<Scrollbar orientation="vertical" class={scrollbarYClasses} />
	{/if}
	{#if orientation === 'horizontal' || orientation === 'both'}
		<Scrollbar orientation="horizontal" class={scrollbarXClasses} />
	{/if}
	<ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
