import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '$lib/server/trpc/router';
import { createSvelteKitContext } from '$lib/server/trpc/context';
import type { RequestHandler } from '@sveltejs/kit';

const handleRequest = async (event: any) => {
	console.log('Handling tRPC request');
	const response = await fetchRequestHandler({
		req: event.request,
		router: appRouter,
		endpoint: '/api/trpc',
		// Zorg dat deze functie zelf niet te zwaar is!
		createContext: createSvelteKitContext(event.locals)
	});

	// CORS headers direct toevoegen
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	response.headers.set('Access-Control-Allow-Credentials', 'true');

	return response;
};

export const GET: RequestHandler = handleRequest;
export const POST: RequestHandler = handleRequest;
export const OPTIONS: RequestHandler = () => new Response(null, { status: 200 });
