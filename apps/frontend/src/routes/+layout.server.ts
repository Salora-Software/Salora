import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth.api.getSession({
		headers: event.request.headers
	});

	return {
		session
	};
};
