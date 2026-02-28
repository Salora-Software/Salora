import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		allowedHosts: ["widget.salora.app", "widgetdev.salora.app"]
	},
	envDir: '../../',
	plugins: [tailwindcss(), sveltekit()]
});
