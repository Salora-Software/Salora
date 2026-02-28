// embed.js

window.resizeIframe = (iframe) => {
	iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
	iframe.style.width = iframe.contentWindow.document.body.scrollWidth + 'px';
	console.log('Resized iframe to', iframe.style.width, iframe.style.height);
};

// global overrideable widget base and origin
window.__SALORA_WIDGET_BASE = window.__SALORA_WIDGET_BASE || 'https://widget.salora.app';
window.__SALORA_WIDGET_ORIGIN = new URL(window.__SALORA_WIDGET_BASE).origin;

window.precreateBookingIframe = (id) => {
	const existing = document.getElementById('preloaded-booking-iframe');
	if (existing) return existing;
	const iframe = document.createElement('iframe');
	iframe.id = 'preloaded-booking-iframe';
	iframe.src = `${window.__SALORA_WIDGET_BASE}/popup/${id}`;
	iframe.style.border = 'none';
	iframe.scrolling = 'no';
	document.body.appendChild(iframe);
	return iframe;
};

window.initBookingWidget = async ({ id, loaded = false }) => {
	if (!loaded) console.log('Waiting for DOM to load');
	document.addEventListener('DOMContentLoaded', () => {
		loaded = true;
	});
	while (!loaded) {
		await new Promise((res) => setTimeout(res, 100));
	}
	console.log('DOM Loaded - Preloading iframe');
	const preloadedIframe = window.precreateBookingIframe(id);
	const target = document.createElement('div');
	target.id = 'booking-widget';
	target.style.display = 'none';
	document.body.appendChild(target);
	target.appendChild(preloadedIframe);
};

window.openBookingWidget = () => {
	const target = document.getElementById('booking-widget');
	if (!target) return;
	console.log('Opening booking widget');
	target.style.display = 'block';
	const iframe = document.getElementById('preloaded-booking-iframe');
	if (iframe) {
		//send message to iframe to open
		iframe.contentWindow.postMessage({ open: true }, window.__SALORA_WIDGET_ORIGIN);
		iframe.style.position = 'fixed';
		iframe.style.top = '0';
		iframe.style.left = '0';
		iframe.style.width = '100%';
		iframe.style.height = '100%';
		iframe.style.zIndex = '999999';

		//remove scrollbars
		iframe.scrolling = 'no';
		iframe.onload = () => {
			window.resizeIframe(iframe);
		};
		document.body.style.overflow = 'hidden';
		window.addEventListener('message', async (e) => {
			if (e.origin !== window.__SALORA_WIDGET_ORIGIN) return;

			// Explicit check for close event
			if (e.data && e.data.open === false) {
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
				document.body.style.position = '';
				document.body.style.width = '';

				iframe.style.pointerEvents = 'none';
				await new Promise((res) => setTimeout(res, 200));
				target.style.display = 'none';
				iframe.style.pointerEvents = 'auto';
			}
		});
	}
};

window.initBookingScreen = (id, targetElementId = 'salora-booking-screen') => {
	const targetDiv = document.getElementById(targetElementId);
	if (!targetDiv) {
		console.error(`Element with ID '${targetElementId}' not found`);
		return null;
	}

	// Check if iframe already exists
	const existingIframe = targetDiv.querySelector('iframe[data-salora-screen]');
	if (existingIframe) {
		console.log('Screen iframe already exists');
		return existingIframe;
	}

	// Create the iframe
	const iframe = document.createElement('iframe');
	iframe.src = `${window.__SALORA_WIDGET_BASE}/screen/${id}`;
	iframe.style.border = 'none';
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.scrolling = 'no';
	iframe.setAttribute('data-salora-screen', 'true');
	iframe.setAttribute('data-screen-id', id);

	// Clear existing content and append iframe
	targetDiv.innerHTML = '';
	targetDiv.appendChild(iframe);

	console.log(`Screen iframe created for ID: ${id} in element: ${targetElementId}`);
	return iframe;
};

(function () {
	// Run the initscript when the with the query param id if present
	const currentScript =
		document.currentScript || document.querySelector('script[src*="salora.app/embed.js"]');
	if (!currentScript) return;

	// Parse script src so embed can accept `?id=...&url=...` params
	const scriptUrl = new URL(currentScript.src, location.href);
	const id = scriptUrl.searchParams.get('id');
	const widgetUrlParam = scriptUrl.searchParams.get('url') || scriptUrl.searchParams.get('widget');
	console.log(widgetUrlParam, 'widget url param');

	if (widgetUrlParam) {
		try {
			const parsed = new URL(widgetUrlParam);
			if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
				// keep origin + pathname (without trailing slash) so paths like /base work
				const basePath = parsed.pathname.replace(/\/$/, '');
				window.__SALORA_WIDGET_BASE = parsed.origin + basePath;
				window.__SALORA_WIDGET_ORIGIN = parsed.origin;
			}
		} catch (e) {
			console.error('Invalid widget url param in embed script:', widgetUrlParam);
		}
	}

	if (id) {
		window.initBookingWidget({ id });
	}

	// Auto-initialize screen widgets when DOM is ready
	const initScreenWidgets = () => {
		const screenElements = document.querySelectorAll('[data-salora-screen-id]');
		screenElements.forEach((element, index) => {
			const screenId = element.getAttribute('data-salora-screen-id');
			if (screenId) {
				// If element doesn't have an ID, create one
				if (!element.id) {
					element.id = `salora-screen-${screenId}-${index}`;
				}
				window.initBookingScreen(screenId, element.id);
			}
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initScreenWidgets);
	} else {
		initScreenWidgets();
	}
})();
