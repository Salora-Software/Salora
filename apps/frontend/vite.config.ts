import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import wasm from 'vite-plugin-wasm';

const deployTarget = process.env.DEPLOY_TARGET;
const isWorker = deployTarget === 'worker';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			enforce: 'pre',
			name: 'wasm-strip-module',
			resolveId(id, importer) {
				if (id.endsWith('.wasm?module')) {
					return this.resolve(id.replace('?module', ''), importer, {
						skipSelf: true
					});
				}
			}
		},
		wasm()
	],
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app'],
		fs: {
			allow: ['../security/dist']
		}
	},
	resolve: {
		alias: {
			'@salora/database': path.resolve(
				__dirname,
				isWorker ? '../../packages/database/index.worker.ts' : '../../packages/database/index.ts'
			)
		}
	},
	define: {
		'import.meta.env.IS_WORKER': JSON.stringify(isWorker)
	},
	optimizeDeps: {
		exclude: ['fingerprint'] // exclude your package from optimization
	},
	ssr: {
		external: ['@libsql/client']
	}
}); //
