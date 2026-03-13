import { mount } from 'svelte';
import WidgetWrapper from '$lib/components/WidgetWrapper.svelte';
import widgetStyles from './app.css?inline';

const script = document.currentScript;
const container = document.createElement('div');
container.id = 'salora-widget-container';

const shadow = container.attachShadow({ mode: 'open' });

// Injecteer CSS direct als style tag
const styleTag = document.createElement('style');
styleTag.textContent = widgetStyles;
shadow.appendChild(styleTag);

const targetDiv = document.createElement('div');
targetDiv.id = 'svelte-root';
shadow.appendChild(targetDiv);

script?.parentNode?.insertBefore(container, script);

const urlParams = new URLSearchParams(window.location.search);
const branchId = urlParams.get('branchId') || urlParams.get('id');

mount(WidgetWrapper, {
	target: targetDiv,
	props: {
		branchId: branchId
	}
});
