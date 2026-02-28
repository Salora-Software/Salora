<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { onMount, tick } from 'svelte';

	let { class: className, value = $bindable(''), placeholder = '', disabled = false } = $props();

	let ref: HTMLDivElement | undefined = $state();
	let isLocked = false;

	// Regex voor variabelen
	const variableRegex = /\{\{(.*?)\}\}/g;

	function escapeHTML(str: string) {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function normalizeText(input: string): string {
		return input.replace(variableRegex, (match, innerContent) => {
			let cleanContent = innerContent.trim();
			cleanContent = cleanContent.replace(/\s+/g, '_');
			if (!cleanContent) return match;
			return `{{ ${cleanContent} }}`;
		});
	}

	// --- Geavanceerde Cursor Logic ---

	// Berekent de absolute index van de cursor in platte tekst
	function getCaretPosition(element: HTMLElement) {
		let caretOffset = 0;
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(element);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			caretOffset = preCaretRange.toString().length;
		}
		return caretOffset;
	}

	// Zet de cursor terug op de juiste plek in de DOM structuur
	function restoreSelection(element: HTMLElement, chars: number) {
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(true); // Start aan het begin

		let currentChars = 0;
		let found = false;

		function traverse(node: Node) {
			if (found) return;

			// Als het een tekstnode is (en geen lege placeholder van svelte)
			if (node.nodeType === Node.TEXT_NODE) {
				const len = node.textContent?.length || 0;
				if (currentChars + len >= chars) {
					// We hebben de juiste node gevonden
					range.setStart(node, chars - currentChars);
					range.collapse(true);
					found = true;
				} else {
					currentChars += len;
				}
			}
			// Als het een element is (zoals onze span), tellen we de inhoud mee
			else if (node.nodeType === Node.ELEMENT_NODE) {
				// Als dit element onze variabele is, springen we eroverheen als de cursor erachter moet
				// Maar we moeten de inhoud wel "tellen" voor de positie
				const contentLen = node.textContent?.length || 0;

				// Speciale check: Als de cursor IN dit blok zou vallen (wat niet kan want contenteditable=false),
				// zetten we hem er net achter.
				if (
					currentChars + contentLen >= chars &&
					(node as HTMLElement).contentEditable === 'false'
				) {
					// Ga door naar de volgende node (waarschijnlijk de zero-width space erna)
					currentChars += contentLen;
				} else {
					for (let i = 0; i < node.childNodes.length; i++) {
						traverse(node.childNodes[i]);
					}
				}
			}
		}

		traverse(element);

		const sel = window.getSelection();
		if (sel) {
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}

	function renderToHTML(text: string) {
		// Dit voorkomt de infinite loop van breaklines.

		// 1. Escape HTML karakters
		const escaped = escapeHTML(text);

		// 2. Vervang variabelen door spans
		return escaped.replace(variableRegex, (match) => {
			// We voegen een zero-width space (\u200B) toe na de span.
			// Dit is cruciaal voor Chrome/Safari om de cursor uit de span te krijgen.
			return `<span class="marked" contenteditable="false">${match}</span>`;
		});
	}

	async function handleInput() {
		if (!ref || isLocked) return;

		// 1. Bewaar cursor positie (platte tekst index)
		const oldCaretPos = getCaretPosition(ref);
		const oldText = ref.innerText;

		// 2. Normaliseer (auto-format {{ ... }})
		const newText = normalizeText(oldText);

		// 3. Update state
		isLocked = true;
		value = newText;

		// 4. Render HTML
		const newHTML = renderToHTML(newText);

		// 5. DOM Update (alleen als nodig)
		if (ref.innerHTML !== newHTML) {
			ref.innerHTML = newHTML;

			// 6. Cursor Correctie
			// Als de tekst langer is geworden door normalisatie (spaties erbij),
			// schuiven we de cursor mee op.
			let newCaretPos = oldCaretPos + (newText.length - oldText.length);

			// Voorkom dat cursor negatief wordt of buiten bereik
			newCaretPos = Math.max(0, Math.min(newCaretPos, newText.length));

			restoreSelection(ref, newCaretPos);
		}

		isLocked = false;
	}

	// Effect voor externe updates (DB load)
	$effect(() => {
		if (!ref || isLocked) return;
		if (ref.innerText !== value) {
			ref.innerHTML = renderToHTML(normalizeText(value));
		}
	});

	onMount(() => {
		if (ref && value) {
			ref.innerHTML = renderToHTML(normalizeText(value));
		}
	});
</script>

<div
	bind:this={ref}
	class={cn(
		// whitespace-pre-wrap is de magische fix voor je breaklines
		'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full overflow-y-auto rounded-md border px-3 py-2 text-base whitespace-pre-wrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		className
	)}
	contenteditable={!disabled}
	role="textbox"
	aria-multiline="true"
	spellcheck="false"
	oninput={handleInput}
></div>

{#if !value && placeholder}
	<div class="text-muted-foreground/50 pointer-events-none absolute top-2 left-3">
		{placeholder}
	</div>
{/if}

<style>
	div[contenteditable] {
		min-height: 80px;
		max-height: 300px;
		outline: none;
		white-space: pre-wrap;
		word-break: break-word;
	}

	:global(.marked) {
		color: #0ea5e9;
		background-color: rgba(14, 165, 233, 0.1);
		border: 1px solid rgba(14, 165, 233, 0.2);
		border-radius: 4px;
		padding: 0 4px;
		font-family: monospace;
		font-weight: 500;
		display: inline-block;
		margin: 0 2px;
		user-select: none; /* Zorgt dat je niet half-in de tag selecteert */
		vertical-align: middle;
	}
</style>
