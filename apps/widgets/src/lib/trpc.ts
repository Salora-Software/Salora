// src/lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink, type TRPCLink } from '@trpc/client';
// @ts-ignore
import type { FetchEsque } from '@trpc/client/dist/internals/types';
import type { AppRouter } from '@salora/trpc-types';
import { PUBLIC_BACKEND_URL } from '$env/static/public';
import { toast } from 'svelte-sonner';
import { observable } from '@trpc/server/observable';
import { m } from '$lib/paraglide/messages.js';
import superjson from './superjson';

type TRPCClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

export const customLink: TRPCLink<AppRouter> = () => {
	return ({ next, op }) => {
		return observable((observer) => {
			const subscription = next(op).subscribe({
				next(value) {
					observer.next(value);
				},
				error(err) {
					try {
						let errors: { message: string; code: string }[] = JSON.parse(err.message);
						for (let error of errors) {
							console.error(error);
							toast.error(
								(m['errors.' + error.message]?.() as string | undefined) ||
								(m['errors.' + error.code]?.() as string | undefined) ||
								(m['errors.default']?.() as string | undefined) ||
								err.message
							);
						}
					} catch (e) {
						toast.error(
							(m['errors.' + (err.message as string)]?.() as string | undefined) ||
							(m['errors.default']?.() as string | undefined) ||
							err.message
						);
						if (Array.isArray(err)) {
							for (let error of err) {
								console.error(error);
							}
						}
					}
					observer.error(err);
				},
				complete() {
					observer.complete();
				}
			});
			return () => subscription.unsubscribe();
		});
	};
};
export const trpc: TRPCClient = createTRPCProxyClient<AppRouter>({
	links: [
		customLink,
		httpBatchLink({
			url: PUBLIC_BACKEND_URL + '/api/trpc',
			transformer: superjson
		})
	]
});
export const trpcS: TRPCClient = createTRPCProxyClient<AppRouter>({
	links: [
		httpBatchLink({
			url: PUBLIC_BACKEND_URL + '/api/trpc',
			transformer: superjson
		})
	]
}); // Server fetch without toast
export const trpcOnServer = (fetch: FetchEsque): TRPCClient =>
	createTRPCProxyClient<AppRouter>({
		links: [
			customLink,
			httpBatchLink({
				url: PUBLIC_BACKEND_URL + '/api/trpc',
				fetch,
				transformer: superjson
			})
		]
	});
