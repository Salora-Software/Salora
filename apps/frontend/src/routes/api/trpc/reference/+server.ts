import { browser } from '$app/environment';
import { appRouter } from '$lib/server/trpc/router';
import type { RequestHandler } from '@sveltejs/kit';
import { renderTrpcPanel } from 'trpc-panel';

export const GET = ((event) => {
	return new Response(
		renderTrpcPanel(appRouter, {
			url: '/api/trpc',
			transformer: 'superjson' // Enabled by default with create-t3-app
		}),
		{
			headers: { 'Content-Type': 'text/html' }
		}
	);
}) satisfies RequestHandler;
