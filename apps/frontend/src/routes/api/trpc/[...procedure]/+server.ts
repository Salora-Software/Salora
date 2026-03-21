import type { RequestHandler } from '@sveltejs/kit';

const isWorkerTarget = process.env.DEPLOY_TARGET === 'worker';

// For Workers, we provide a stub that tells clients to use the external backend API
// The tRPC backend must run as a separate Node.js service (e.g., Docker)
async function workersStub(event: any) {
	return new Response(
		JSON.stringify({
			error: 'tRPC backend is not available on this Workers deployment. Please configure env.PUBLIC_BACKEND_URL  to point to your Node.js backend API.'
		}),
		{
			status: 503,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		}
	);
}

// For Node runtime, use the real tRPC handler
let realHandler: any = null;

async function getNodeHandler() {
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
	const handler = await getNodeHandler();
	return handler.OPTIONS(event);
};

export const GET: RequestHandler = async (event) => {
	const handler = await getNodeHandler();
	return handler.GET(event);
};

export const POST: RequestHandler = async (event) => {
	const handler = await getNodeHandler();
	return handler.POST(event);
};
