import type { RequestHandler } from '@sveltejs/kit';

let realHandler: any = null;

async function getHandler() {
	if (realHandler) return realHandler;

	const { createSvelteKitContext } = await import('$lib/server/trpc/context');
	const { appRouter } = await import('$lib/server/trpc/router');
	const { fetchRequestHandler } = await import('@trpc/server/adapters/fetch');

	function addCorsHeaders(response: Response): Response {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		return response;
	}

	realHandler = {
		async GET(event: any) {
			const response = await fetchRequestHandler({
				req: event.request,
				router: appRouter,
				endpoint: '/api/trpc',
				createContext: createSvelteKitContext(event.locals)
			});
			return addCorsHeaders(response);
		},
		async POST(event: any) {
			const response = await fetchRequestHandler({
				req: event.request,
				router: appRouter,
				endpoint: '/api/trpc',
				createContext: createSvelteKitContext(event.locals)
			});
			return addCorsHeaders(response);
		},
		async OPTIONS() {
			return new Response(null, { status: 200 });
		}
	};

	return realHandler;
}

export const OPTIONS: RequestHandler = async (event) => {
	const handler = await getHandler();
	return handler.OPTIONS(event);
};

export const GET: RequestHandler = async (event) => {
	const handler = await getHandler();
	return handler.GET(event);
};

export const POST: RequestHandler = async (event) => {
	const handler = await getHandler();
	return handler.POST(event);
};
