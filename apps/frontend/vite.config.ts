import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		rollupOptions: {
			external: ['cloudflare:sockets']
		}
	},
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app'],
		fs: {
			allow: ['../security/dist']
		}
	},
	optimizeDeps: {
		exclude: ['fingerprint'] // exclude your package from optimization
	},
	ssr: {
		external: ['@libsql/client', 'cloudflare:sockets']
	}
}); //
