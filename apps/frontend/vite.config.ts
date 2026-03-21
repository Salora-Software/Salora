import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from "rollup-plugin-visualizer"
import path from 'path';

const deployTarget = process.env.DEPLOY_TARGET;
const isWorker = deployTarget === 'worker';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(
	),
	],
	assetsInclude: ['/packages/fingerprint/src/client.ts', '**/*.wasm?module'],
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
}); //
