<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher, setMode, setTheme, theme } from 'mode-watcher';
	import '../app.css';
	import { onMount } from 'svelte';
	import Themer from '$lib/components/Themer.svelte';
	import { page } from '$app/state';

	const mode = 'light';

	setMode(mode);
	let { children, data } = $props();
	let branch = $derived(data.branch);

	onMount(() => {
		window.addEventListener('message', (event) => {
			if (event.data.type === 'updateMode' && typeof event.data.modeType === 'string') {
				setMode(event.data.modeType);
			}
			if (event.data.type === 'updateTheme' && typeof event.data.color === 'string') {
				setTheme(event.data.color);
			}
		});

		const themeParam = page.url.searchParams.get('theme');
		if (themeParam) {
			setTheme(themeParam);
		}
		const modeParam = page.url.searchParams.get('mode');
		if (modeParam === 'light' || modeParam === 'dark') {
			setMode(modeParam);
		}
	});
</script>

<ModeWatcher
	track={false}
	defaultMode={mode}
	modeStorageKey={`lumabooking-mode-${branch?.id}`}
	themeStorageKey={`lumabooking-theme-${branch?.id}`}
/>
<main class="h-screen w-screen">
	<Themer colorTheme={theme.current}>
		{@render children()}
	</Themer>
</main>
