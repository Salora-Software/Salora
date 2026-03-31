import { createAuth } from '$lib/server/auth'; // Path to your auth file
import { createDb } from '@salora/database';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	console.log(`Handler loaded`);
	if (!event.platform?.env?.DB) {
		throw new Error('Geen database binding gevonden voor dit request.');
	}

	// Initialiseer db en auth één keer per request
	event.locals.db = createDb(event.platform.env.DB);
	event.locals.auth = createAuth(event.locals.db, event.url.origin);

	// Handle CORS preflight requests
	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Max-Age': '86400'
			}
		});
	}

	// Extract the IP address from headers or connection info
	const headers = event.request.headers;
	const ip =
		headers.get('x-forwarded-for') || // Used in proxies/load balancers
		headers.get('x-real-ip') || // Common alternative
		event.getClientAddress(); // SvelteKit method (works with most setups)

	event.locals.ip = ip;

	const response = await svelteKitHandler({
		event,
		resolve,
		auth: event.locals.auth,
		building: false
	});
	// Add CORS headers to all responses
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With'
		);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
	}

	return response;
};
