<script lang="ts">
	import { Label as LabelPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		required = false,
		class: className,
		...restProps
	}: LabelPrimitive.RootProps & {
		required?: boolean | string;
	} = $props();
</script>

<div class="flex gap-1">
	<LabelPrimitive.Root
		bind:ref
		class={cn(
			'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ',
			className
		)}
		{...restProps}
	/>
	{#if required}
		<span class={cn('text-red-500 ', required)}>*</span>
	{/if}
</div>
