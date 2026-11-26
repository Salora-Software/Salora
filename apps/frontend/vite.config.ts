import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { version } = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version: string };

const backendSrc = fileURLToPath(new URL('../backend/src/', import.meta.url));

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(version)
	},
	resolve: {
		alias: [
			{ find: /^@backend\//, replacement: backendSrc },
			{ find: /^@\//, replacement: backendSrc }
		]
	},
	build: {
		rollupOptions: {
			external: [/^cloudflare:/, /^node:/]
		}
	},
	plugins: [tailwindcss(), sveltekit()],
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app']
	},
	ssr: {
		external: ['@libsql/client'],
		noExternal: ['@tanstack/svelte-query', '@orpc/tanstack-query', '@orpc/client']
	}
}); //
