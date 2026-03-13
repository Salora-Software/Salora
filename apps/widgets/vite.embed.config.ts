import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	envDir: '../../',
	plugins: [
		tailwindcss(),
		svelte({
			compilerOptions: {
				css: 'injected'
			}
		}), // Geen SvelteKit, alleen barebones Svelte
		{
			name: 'sveltekit-env-shim',
			resolveId(id) {
				if (id === '$env/static/public') return '\0' + id;
			},
			load(id) {
				if (id === '\0$env/static/public') {
					// Genereer een export voor elke gevonden PUBLIC_ variabele
					return Object.entries(process.env)
						.map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
						.join('\n');
				}
			}
		},
		visualizer({ open: true, filename: 'bundle-analysis.html', gzipSize: true })
	],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'), // Herstel de SvelteKit alias
			luxon: path.resolve(__dirname, 'node_modules/luxon/src/luxon.js')
		}
	},
	build: {
		cssCodeSplit: false, // Bundel alle CSS in één bestand (voorkomt losse snippers)
		lib: {
			entry: 'src/embed.ts',
			formats: ['iife'],
			name: 'SaloraWidget',
			fileName: () => 'widget.js'
		}
	}
});
