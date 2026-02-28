import { createSvelteKitContext } from '$lib/server/trpc/context';
import { appRouter } from '$lib/server/trpc/router';
import type { RequestHandler } from '@sveltejs/kit';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	response.headers.set('Access-Control-Allow-Credentials', 'true');
	return response;
}

export const OPTIONS: RequestHandler = async () => {
	return addCorsHeaders(new Response(null, { status: 200 }));
};

export const GET = (async (event) => {
	const response = await fetchRequestHandler({
		req: event.request,
		router: appRouter,
		endpoint: '/api/trpc',
		createContext: createSvelteKitContext(event.locals)
	});
	return addCorsHeaders(response);
}) satisfies RequestHandler;

export const POST = (async (event) => {
	const response = await fetchRequestHandler({
		req: event.request,
		router: appRouter,
		endpoint: '/api/trpc',
		createContext: createSvelteKitContext(event.locals)
	});
	return addCorsHeaders(response);
}) satisfies RequestHandler;
