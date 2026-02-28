import type { RequestHandler } from '@sveltejs/kit';

export const GET = ((event) => {
	return new Response(
		JSON.stringify({
			message:
				"Oops! You shouldn't be looking here. But since you're here, check out our fully automated generated docs at ./api/trpc and ./api/auth."
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
}) satisfies RequestHandler;
