import adapterCloudflare from '@sveltejs/adapter-cloudflare-workers';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const deployTarget = process.env.DEPLOY_TARGET;
const useWorkerAdapter = deployTarget === 'worker';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		env: {
			dir: '../../'
		},
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: useWorkerAdapter ? adapterCloudflare() : adapterNode()
	}
};

export default config;
