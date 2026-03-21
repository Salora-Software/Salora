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
	assetsInclude: ['/packages/fingerprint/src/client.ts'],
	server: {
		allowedHosts: ['salora.hexidev.nl', 'dev.salora.app'],
		fs: {
			allow: ['../security/dist']
		}
	},
	resolve: {
		alias: {
			'$prisma': path.resolve(
				isWorker ? './src/lib/server/prisma-worker.ts' : './src/lib/server/prisma-node.ts'
			)
		}
	},
	optimizeDeps: {
		exclude: ['fingerprint'] // exclude your package from optimization
	},
}); //
