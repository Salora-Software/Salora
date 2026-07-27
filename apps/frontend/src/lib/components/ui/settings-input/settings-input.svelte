<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { DropdownMenu } from '$lib/components/ui/dropdown-menu/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Loader, Plus, Minus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { ChevronsUpDown, Check } from '@lucide/svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { cn } from '$lib/utils';
	import { tick } from 'svelte';
	import Badge from '../badge/badge.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import NumberInput from '../number-input/number-input.svelte';
	export type SettingsInputProps = {
		title?: string;
		description?: string | (() => string);
		type?:
			'input' | 'button' | 'select' | 'checkbox' | 'number' | 'combobox' | 'multiSelect' | 'switch';
		options?: {
			label: string;
			value: string;
		}[];
		errored?: string | boolean;
		button?: string;
		placeholder?: string;
		loading?: boolean;
		required?: boolean;
		danger?: boolean;
		value?: string | string[] | (() => string | string[] | number) | number;
		class?: string;
		selected?: string[];
		onclick?: (value: string | string[] | number) => Promise<void>;
	};
	let {
		title = '',
		description = '',
		type,
		danger = false,
		options = [],
		button = '',
		placeholder = '',
		loading = false,
		class: className = '',
		onclick,
		value = $bindable(''),
		selected = $bindable([]),
		errored = false,
		required = false,
		...restProps
	}: SettingsInputProps = $props();
	let open = $state(false);
	let valueState = $state(typeof value === 'function' ? value() : value);
	$effect(() => {
		if (valueState) {
			tick().then(() => {
				value = valueState;
			});
		} else {
			value = '';
		}
	});
</script>

<div class={cn(danger ? 'text-red-500' : '', className)}>
	{#if type === 'input' || type === 'number' || type === 'select' || type === 'checkbox' || type === 'combobox' || type === 'multiSelect'}
		<h3 class="text-md font-semibold">
			{title}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}

			{#if description && typeof description === 'function' && description()}
				<span class="mb-1 text-sm text-gray-500">({description()})</span>
			{/if}
		</h3>
		{#if description && typeof description === 'string'}
			<p class="mb-1 text-sm text-gray-500">{description}</p>
		{/if}
		{#if type === 'input' || type === 'number'}
			<div class="mt-1 flex items-center gap-2">
				{#if type === 'number'}
					<NumberInput
						{placeholder}
						disabled={loading}
						bind:value={valueState}
						class={`h-10  max-w-45`}
						{...restProps}
					/>
				{:else if type === 'input'}
					<Input
						{placeholder}
						disabled={loading}
						bind:value={valueState}
						class={`h-10 ${onclick ? 'max-w-87.5' : 'max-w-150'}`}
						{...restProps}
					/>
					{#if errored}
						<p class="mt-1 text-sm text-red-500">{errored}</p>
					{/if}
					{#if onclick}
						<Button
							class="h-10"
							onclick={async () => {
								loading = true;
								try {
									if (onclick) {
										const resolvedValue = valueState;
										await onclick(resolvedValue);
										toast.success(`${title} is succesvol bijgewerkt`);
									}
								} catch (error) {
									toast.error(
										`Er is een fout opgetreden bij het bijwerken van ${title}, Is de invoer correct?`
									);
								} finally {
									loading = false;
								}
							}}
							disabled={loading}
							variant={danger ? 'destructive' : 'secondary'}
						>
							{#if loading}
								<Loader class="animate-spin" />
							{:else}
								Toepassen
							{/if}
						</Button>
					{/if}
				{/if}
			</div>
		{:else if type === 'select'}
			{#if typeof value === 'string'}
				{#if typeof valueState === 'string'}
					<Select.Root bind:value={valueState} type="single">
						<Select.Trigger class="w-45">
							<p>
								{valueState || placeholder}
							</p></Select.Trigger
						>
						<Select.Content>
							{#if valueState}
								{#each options as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				{/if}
			{/if}
		{:else if type === 'checkbox'}
			<Checkbox />
		{:else if type === 'combobox'}
			<Popover.Root>
				<Popover.Trigger>
					<Button
						variant="outline"
						class="w-50 justify-between"
						role="combobox"
						aria-expanded={open}
					>
						{options.find((option) => option.value === value)?.label || 'Selecteer een optie...'}
						<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</Popover.Trigger>
				<Popover.Content class="w-50 p-0">
					<Command.Root>
						<Command.Input placeholder="Zoeken..." />
						<Command.List>
							<Command.Empty>Geen resultaten gevonden.</Command.Empty>
							<Command.Group>
								<ScrollArea class="h-62.5 max-h-min">
									{#each options as option}
										<Command.Item
											value={option.value}
											onSelect={() => {
												value = option.value;
											}}
										>
											<Check
												class={cn('mr-2 size-4', value !== option.value && 'text-transparent')}
											/>
											{option.label}
										</Command.Item>
									{/each}
								</ScrollArea>
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		{:else if type === 'multiSelect'}
			{#if Array.isArray(valueState)}
				<Select.Root type="multiple" bind:value={selected} bind:open>
					<Select.Trigger class={cn('w-45', className)}>
						<div class="flex flex-wrap gap-2">
							{#each selected as option}
								<Badge
									variant="outline"
									class="flex items-center gap-1"
									onmousedown={async (e) => {
										open = false;
									}}
									onclick={async () => {
										await tick();
										open = false;
										selected = selected.filter((s) => s !== option);
									}}
								>
									<Plus class="rotate-45" size="15" />
									{option}</Badge
								>
							{/each}
						</div>
					</Select.Trigger>
					<Select.Content>
						{#if valueState}
							{#each $state.snapshot(valueState) as option}
								<Select.Item value={option}>{option}</Select.Item>
							{/each}
						{/if}
					</Select.Content>
				</Select.Root>
			{/if}
		{/if}
	{:else if type === 'button'}
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-md font-semibold">{title}</h3>
				{#if description}
					<p class="text-sm text-gray-500">{description}</p>
				{/if}
			</div>
			<Button
				variant={danger ? 'destructive' : 'secondary'}
				onclick={() => onclick && onclick(typeof value === 'function' ? value() : value)}
			>
				{button}
			</Button>
		</div>
	{:else if type === 'switch'}
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-md font-semibold">{title}</h3>
				{#if description}
					<p class="text-sm text-gray-500">{description}</p>
				{/if}
			</div>
			<Switch
				checked={!!valueState}
				onclick={async () => {
					loading = true;
					try {
						valueState = valueState === 'true' ? '' : 'true';
						if (onclick) {
							await onclick(valueState);
							toast.success(`${title} is succesvol bijgewerkt`);
						}
					} catch (error) {
						toast.error(
							`Er is een fout opgetreden bij het bijwerken van ${title}, Is de invoer correct?`
						);
					} finally {
						loading = false;
					}
				}}
			/>
		</div>
	{/if}
</div>
