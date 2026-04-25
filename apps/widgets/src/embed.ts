import { mount } from 'svelte';
import WidgetWrapper from '$lib/components/WidgetWrapper.svelte';
import widgetStyles from './app.css?inline';

// --- TAILWIND V4 SHADOW DOM FIX START ---
let processedCss = widgetStyles.replace(/:root\b/g, ':host');

const propertyRules: string[] = [];
const shadowCss = processedCss.replace(/@property\s+[^{]+\{[^}]*\}/g, (match) => {
	propertyRules.push(match);
	return '';
});

if (propertyRules.length > 0 && !document.getElementById('salora-tw-properties')) {
	const propStyle = document.createElement('style');
	propStyle.id = 'salora-tw-properties';
	propStyle.textContent = propertyRules.join('\n');
	document.head.appendChild(propStyle);
}
// --- TAILWIND V4 SHADOW DOM FIX END ---

const script = document.currentScript;
const container = document.createElement('div');
container.id = 'salora-widget-container';

const shadow = container.attachShadow({ mode: 'open' });

const styleTag = document.createElement('style');
styleTag.textContent = shadowCss;
shadow.appendChild(styleTag);

const targetDiv = document.createElement('div');
targetDiv.id = 'svelte-root';
shadow.appendChild(targetDiv);

script?.parentNode?.insertBefore(container, script);

const scriptEl = script instanceof HTMLScriptElement ? script : null;
const branchId =
	scriptEl?.dataset.id ||
	scriptEl?.dataset.branchId ||
	new URLSearchParams(window.location.search).get('branchId');
const endpoint =
	scriptEl?.dataset.endpoint ||
	scriptEl?.dataset.backendUrl ||
	new URLSearchParams(window.location.search).get('endpoint') ||
	'https://app.salora.app';

mount(WidgetWrapper, {
	target: targetDiv,
	props: {
		branchId: branchId,
		endpoint
	}
});
