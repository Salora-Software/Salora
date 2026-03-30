import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

const isWorker = process.env.DEPLOY_TARGET === 'worker';

export default defineConfig({
	server: {
		allowedHosts: ["widget.salora.app", "widgetdev.salora.app"]
	},
	build: {
        lib: {
            // Kies dynamisch het startpunt op basis van de variabele
            entry: isWorker 
                ? resolve(__dirname, 'src/index.worker.ts') 
                : resolve(__dirname, 'src/index.ts'),
            // Forceer de uiteindelijke bestandsnaam, zodat imports in je app blijven werken
            fileName: 'index',
            formats: ['es']
        },
        emptyOutDir: true,
        rollupOptions: {
            // Zorg dat de Node-versie native modules niet probeert te bundelen
            external: isWorker ? [] : ['pg', 'mysql2', /node:/] 
        }
    },
	envDir: '../../',
	plugins: [tailwindcss(), sveltekit()]
});
