<script lang="ts">
	import { onMount } from 'svelte';

	const sitekey = 'JOUW_PUBLIC_SITE_KEY'; // Vervang dit met je Turnstile site key
	let widgetId: string | undefined;

	onMount(() => {
		// Callback die wordt afgevuurd zodra het Turnstile script is ingeladen
		(window as any).onTurnstileLoad = () => {
			widgetId = (window as any).turnstile.render('#captcha-container', {
				sitekey,
				execution: 'execute', // Zorgt dat hij niet direct begint, maar wacht op jouw trigger
				callback: (token: string) => {
					// Succes: stuur het token terug naar je widget
					window.parent.postMessage({ type: 'turnstile_success', token }, '*');
				},
				'error-callback': () => {
					window.parent.postMessage({ type: 'turnstile_error' }, '*');
				},
				'before-interactive-callback': () => {
					// Turnstile wil een visuele challenge tonen.
					// Dit is het moment dat je widget het iframe zichtbaar/groter moet maken.
					window.parent.postMessage({ type: 'turnstile_challenge' }, '*');
				}
			});
		};

		// Ontvang commando's vanuit de website van de klant
		const handleMessage = (event: MessageEvent) => {
			// Tip: Beveilig dit door event.origin te controleren op jouw toegestane domeinen
			if (event.data?.action === 'execute') {
				(window as any).turnstile.execute('#captcha-container');
			} else if (event.data?.action === 'reset' && widgetId !== undefined) {
				(window as any).turnstile.reset(widgetId);
			}
		};

		window.addEventListener('message', handleMessage);

		// Opruimen bij destroy
		return () => {
			window.removeEventListener('message', handleMessage);
			if (widgetId !== undefined) {
				(window as any).turnstile.remove(widgetId);
			}
		};
	});
</script>

<svelte:head>
	<script
		src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
		async
		defer
	></script>
</svelte:head>

<div id="captcha-container"></div>

<style>
	/* Haal alle standaard marge weg zodat het strak in je iframe past */
	:global(body, html) {
		margin: 0;
		padding: 0;
		background: transparent;
		overflow: hidden;
	}
</style>
