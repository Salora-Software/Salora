import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		env: {
			dir: '../../'
		},
		adapter: adapterCloudflare({
			platformProxy: {
				configPath: '../../wrangler.jsonc',
				environment: 'dev',
				persist: {
					path: '../../.wrangler/state/v3'
				}
			}
		})
	}
};

export default config;
