<script lang="ts">
	import { InputInline } from '$lib/components/ui/input-inline';
	import { enforceSingleMinus } from './utils';
	import { onMount } from 'svelte';

	interface Props {
		discountValue: number | null;
		discountType: 'euro' | 'percent';
		onDiscountChange: (value: number | null, type: 'euro' | 'percent') => void;
	}

	let {
		discountValue = $bindable(),
		discountType = $bindable(),
		onDiscountChange
	}: Props = $props();

	let keypadInput = $state('');
	let lastInputFromKeypad = false;
	let discountInputRef: HTMLInputElement | null = $state(null);

	$effect(() => {
		// Only update keypadInput if the change was not from the input field
		if (!lastInputFromKeypad) {
			keypadInput = discountValue || discountValue === 0 ? String(discountValue) : '';
		}
		lastInputFromKeypad = false;
	});

	function handleKeypad(key: string | number) {
		lastInputFromKeypad = true;
		if (typeof key === 'number' || key === '.') {
			let next = keypadInput + String(key);
			// Remove leading zeros except for '0' or '0.'
			if (/^0[0-9]+/.test(next.replace(/^-/, ''))) {
				next = (next.startsWith('-') ? '-' : '') + next.replace(/^0+/, '');
			}
			next = enforceSingleMinus(next);
			keypadInput = next;
			const newValue = parseFloat(keypadInput) || 0;
			onDiscountChange(newValue, discountType);
		} else if (key === '+') {
			const newType = 'euro';
			if (keypadInput) {
				const newValue = Math.abs(parseFloat(keypadInput)) || 0;
				keypadInput = enforceSingleMinus(String(newValue));
				onDiscountChange(newValue, newType);
			}
		} else if (key === '-') {
			const newType = 'euro';
			if (!keypadInput) {
				keypadInput = '-';
				onDiscountChange(0, newType);
			} else if (keypadInput.startsWith('-')) {
				keypadInput = enforceSingleMinus(keypadInput.slice(1));
				const newValue = parseFloat(keypadInput) || 0;
				onDiscountChange(newValue, newType);
			} else {
				keypadInput = enforceSingleMinus('-' + keypadInput);
				const newValue = parseFloat(keypadInput) || 0;
				onDiscountChange(newValue, newType);
			}
		} else if (key === 'C') {
			keypadInput = '';
			onDiscountChange(0, discountType);
		} else if (key === '⌫') {
			keypadInput = enforceSingleMinus(keypadInput.slice(0, -1));
			const newValue = parseFloat(keypadInput) || 0;
			onDiscountChange(newValue, discountType);
		} else if (key === 'apply') {
			keypadInput = '';
		}
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			// Only handle if not typing in a text input/textarea/selector
			const tag = (e.target as HTMLElement)?.tagName;
			if (
				tag === 'INPUT' ||
				tag === 'TEXTAREA' ||
				tag === 'SELECT' ||
				(e.target as HTMLElement)?.isContentEditable
			)
				return;

			// Focus the discount input if not already focused
			if (discountInputRef && document.activeElement !== discountInputRef) {
				discountInputRef.focus();
			}

			if (e.key >= '0' && e.key <= '9') {
				handleKeypad(Number(e.key));
				e.preventDefault();
			} else if (e.key === '.') {
				handleKeypad('.');
				e.preventDefault();
			} else if (e.key === '+') {
				handleKeypad('+');
				e.preventDefault();
			} else if (e.key === '-') {
				handleKeypad('-');
				e.preventDefault();
			} else if (e.key === 'Backspace') {
				handleKeypad('⌫');
				e.preventDefault();
			} else if (e.key === 'Delete') {
				handleKeypad('C');
				e.preventDefault();
			} else if (e.key === 'Enter') {
				handleKeypad('apply');
				e.preventDefault();
			}
		}
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div>
	<div class="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-3">
		<InputInline
			id="discount"
			bind:value={keypadInput}
			inputmode="decimal"
			pattern="[0-9.\-]*"
			bind:ref={discountInputRef}
			class="h-12 max-w-full"
			oninput={(e) => {
				lastInputFromKeypad = false;
				let val = (e.target as HTMLInputElement).value.replace(/[^0-9.\-]/g, '');
				// Remove leading zeros except for '0' or '0.'
				if (/^0[0-9]+/.test(val)) {
					val = val.replace(/^0+/, '');
				}
				val = enforceSingleMinus(val);
				keypadInput = val;
				const newValue = parseFloat(val) || null;
				onDiscountChange(newValue, discountType);
			}}
		/>
	</div>
	<div class="mb-0 grid grid-cols-4 gap-2 sm:gap-3">
		{#each [1, 2, 3] as key}
			<button
				class="hover:border-primary/30 border-border bg-background text-foreground hover:bg-muted h-10 rounded-lg border text-lg font-semibold transition-all duration-150 active:scale-[0.98] sm:h-12 sm:text-xl"
				onclick={() => handleKeypad(key)}
			>
				{key}
			</button>
		{/each}
		<button
			class="h-10 rounded-lg bg-[var(--color-success)] text-lg font-semibold text-[var(--color-success-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--color-success)]/90 active:scale-[0.98] sm:h-14 sm:text-xl"
			onclick={() => handleKeypad('+')}
		>
			+
		</button>
		{#each [4, 5, 6] as key}
			<button
				class="hover:border-primary/30 border-border bg-background text-foreground hover:bg-muted h-10 rounded-lg border text-lg font-semibold transition-all duration-150 active:scale-[0.98] sm:h-14 sm:text-xl"
				onclick={() => handleKeypad(key)}
			>
				{key}
			</button>
		{/each}
		<button
			class="h-10 rounded-lg bg-[var(--color-warning)] text-lg font-semibold text-[var(--color-warning-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--color-warning)]/90 active:scale-[0.98] sm:h-14 sm:text-xl"
			onclick={() => handleKeypad('-')}
		>
			−
		</button>
		{#each [7, 8, 9] as key}
			<button
				class="hover:border-primary/30 border-border bg-background text-foreground hover:bg-muted h-10 rounded-lg border text-lg font-semibold transition-all duration-150 active:scale-[0.98] sm:h-14 sm:text-xl"
				onclick={() => handleKeypad(key)}
			>
				{key}
			</button>
		{/each}
		<button
			class="h-10 rounded-lg bg-[var(--color-error)] text-lg font-semibold text-[var(--color-error-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--color-error)]/90 active:scale-[0.98] sm:h-14 sm:text-xl"
			onclick={() => handleKeypad('C')}
		>
			C
		</button>
		<button
			class="hover:border-primary/30 border-border bg-background text-foreground hover:bg-muted col-span-2 h-10 rounded-lg border text-lg font-semibold transition-all duration-150 active:scale-[0.98] sm:h-14 sm:text-xl"
			onclick={() => handleKeypad(0)}
		>
			0
		</button>
		<button
			class="hover:border-primary/30 border-border bg-background text-foreground hover:bg-muted h-10 rounded-lg border text-lg font-semibold transition-all duration-150 active:scale-[0.98] sm:h-14 sm:text-xl"
			onclick={() => handleKeypad('.')}
		>
			.
		</button>
		<button
			class="bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-lg text-base font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] sm:h-14 sm:text-lg"
			onclick={() => handleKeypad('apply')}
		>
			✓
		</button>
	</div>
</div>
