import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFound } from '@/components/not-found';

export function getRouter() {
	return createTanStackRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		defaultNotFoundComponent: NotFound, defaultErrorComponent: ({ error }) => {
			console.error('SERVER RENDER ERROR:', error) // Dit dumpt de werkelijke fout in je build logs
			return <div>Error!</div>
		},
	});
}
