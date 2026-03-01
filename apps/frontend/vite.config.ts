import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' }),tailwindcss(), sveltekit()],
	assetsInclude: ['/packages/fingerprint/src/client.ts'],
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app'],
		fs: {
			allow: ['../security/dist']
		}
	},
	resolve: {
		alias: {}
	},
	optimizeDeps: {
		exclude: ['fingerprint'] // exclude your package from optimization
	}
}); //
