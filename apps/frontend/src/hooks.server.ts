// src/hooks.server.ts
import type { Handle, HandleFetch } from '@sveltejs/kit';
import { QueryClient } from '@tanstack/query-core';

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type'
	});
};

export const handleFetch: HandleFetch = async ({ request, event, fetch }) => {
	// Stuur cookies of specifieke headers door van de client-aanvraag
	const cookie = event.request.headers.get('cookie');
	console.log('handleFetch called', request.url, cookie);
	if (cookie) {
		request.headers.set('cookie', cookie);
	}

	// Of stuur álle request headers door:
	// event.request.headers.forEach((value, key) => {
	//     if (!request.headers.has(key)) request.headers.set(key, value);
	// });

	return fetch(request);
};
