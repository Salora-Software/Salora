import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig({
	plugins: [lucidePreprocess(), tailwindcss(), sveltekit()],
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
		external: ['@libsql/client']
	}
}); //
