import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import viteReact from '@vitejs/plugin-react';

export default defineConfig({
	server: {
		port: 3000,
	},
	plugins: [
		mdx(await import('./source.config')),
		tailwindcss(),
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tanstackStart({
			prerender: {
				enabled: true,
				autoSubfolderIndex: false,
				crawlLinks: true,
			},

			pages: [
				{
					path: '/docs/',
				},
				{
					path: '/api/search',
				},
				{
					path: 'llms-full.txt',
				},
				{
					path: 'llms.txt',
				},
			],
		}),
		viteReact(),
		// please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
	],
});
