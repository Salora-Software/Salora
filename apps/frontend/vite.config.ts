import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import lucidePreprocess from 'vite-plugin-lucide-preprocess';

export default defineConfig({
	build: {
		rollupOptions: {
			external: [/^cloudflare:/, /^node:/]
		}
	},
	plugins: [lucidePreprocess(), tailwindcss(), sveltekit()],
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app']
	},
	ssr: {
		external: ['@libsql/client']
	}
}); //
