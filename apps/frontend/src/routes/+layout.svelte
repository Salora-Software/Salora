<script>
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';

	let { data, children } = $props();

	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { browser, dev } from '$app/environment';
	import { RenderScan } from 'svelte-render-scan';
	import { page } from '$app/state';
</script>

<!-- No JavaScript Banner -->
<noscript>
	<div
		style="
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: #f7df1e;
		z-index: 999999;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		font-family: system-ui, -apple-system, sans-serif;
		color: #000;
		text-align: center;
		padding: 2rem;
		box-sizing: border-box;
	"
	>
		<div style="max-width: 600px;">
			<h1
				style="
				font-size: 3rem;
				font-weight: bold;
				margin-bottom: 1.5rem;
				line-height: 1.2;
			"
			>
				⚠️ JavaScript Required
			</h1>

			<p
				style="
				font-size: 1.25rem;
				margin-bottom: 2rem;
				line-height: 1.6;
				opacity: 0.9;
			"
			>
				This website requires JavaScript to function properly. Please enable JavaScript in your
				browser to continue.
			</p>

			<div
				style="
				background-color: rgba(0, 0, 0, 0.1);
				padding: 1.5rem;
				border-radius: 8px;
				margin-bottom: 2rem;
			"
			>
				<h2
					style="
					font-size: 1.5rem;
					margin-bottom: 1rem;
					font-weight: 600;
				"
				>
					Quick Steps:
				</h2>
				<ol
					style="
					text-align: left;
					font-size: 1rem;
					line-height: 1.8;
					margin: 0;
					padding-left: 1.5rem;
				"
				>
					<li>
						<strong>Chrome/Edge:</strong> Settings → Privacy and security → Site Settings → JavaScript
						→ Allowed
					</li>
					<li><strong>Firefox:</strong> about:config → javascript.enabled → true</li>
					<li><strong>Safari:</strong> Preferences → Security → Enable JavaScript</li>
				</ol>
			</div>

			<a
				href="https://www.enable-javascript.com/"
				style="
				display: inline-block;
				background-color: #000;
				color: #f7df1e;
				padding: 1rem 2rem;
				text-decoration: none;
				border-radius: 6px;
				font-weight: 600;
				font-size: 1.1rem;
				transition: all 0.2s ease;
			"
			>
				📖 Detailed Instructions
			</a>

			<p
				style="
				margin-top: 2rem;
				font-size: 0.9rem;
				opacity: 0.7;
			"
			>
				After enabling JavaScript, please refresh this page.
			</p>
		</div>
	</div>
</noscript>

{#if dev && false}
	<RenderScan />
{/if}
<ModeWatcher defaultMode="light" />
<div>
	<Toaster position={'top-right'} richColors />
	<QueryClientProvider client={data.queryClient}>
		{@render children()}
	</QueryClientProvider>
</div>
