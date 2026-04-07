// src/lib/trpc.ts
import { createTRPCProxyClient, httpLink, type TRPCClient, type TRPCLink } from '@trpc/client';
// @ts-ignore
import type { FetchEsque } from '@trpc/client/dist/internals/types';
import type { AppRouter, RouterOutput } from '@salora/trpc-types';
import { toast } from 'svelte-sonner';
import { observable } from '@trpc/server/observable';
import { t } from './translation';
import superjson from './superjson';

export type TRPCRouterClient = TRPCClient<AppRouter>;
const DEFAULT_BACKEND_URL = 'https://app.salora.app';

const normalizeBackendUrl = (url?: string | null): string => {
	if (!url) return DEFAULT_BACKEND_URL;
	return url.replace(/\/$/, '');
};

const resolvedBackendUrl = normalizeBackendUrl();

export const createTrpcClient = (backendUrl?: string): TRPCRouterClient =>
	createTRPCProxyClient<AppRouter>({
		links: [
			customLink,
			httpLink({
				url: `${normalizeBackendUrl(backendUrl)}/api/trpc`,
				transformer: superjson
			})
		]
	});

export const customLink: TRPCLink<AppRouter> = () => {
	return ({ next, op }) => {
		return observable((observer) => {
			const subscription = next(op).subscribe({
				next(value) {
					observer.next(value);
				},
				error(err) {
					try {
						let errors: { message: keyof typeof t.errors; code: keyof typeof t.errors }[] =
							JSON.parse(err.message);

						for (let error of errors) {
							console.error(error);
							toast.error(t.errors[error.message] || t.errors[error.code] || t.errors.default);
						}
					} catch (e) {
						toast.error(t.errors[err.message as keyof typeof t.errors] || t.errors.default);
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
export const trpc: TRPCRouterClient = createTrpcClient(resolvedBackendUrl);
export const trpcS: TRPCRouterClient = createTRPCProxyClient<AppRouter>({
	links: [
		httpLink({
			url: `${resolvedBackendUrl}/api/trpc`,
			transformer: superjson
		})
	]
}); // Server fetch without toast
export const trpcOnServer = (fetch: FetchEsque, backendUrl?: string): TRPCRouterClient =>
	createTRPCProxyClient<AppRouter>({
		links: [
			customLink,
			httpLink({
				url: `${normalizeBackendUrl(backendUrl ?? resolvedBackendUrl)}/api/trpc`,
				fetch,
				transformer: superjson
			})
		]
	});
