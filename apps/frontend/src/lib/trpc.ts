// src/lib/trpc.ts
import { createTRPCProxyClient, httpLink, type TRPCLink } from '@trpc/client';
// @ts-ignore
import type { FetchEsque } from '@trpc/client/dist/internals/types';
import type { AppRouter } from '$lib/server/trpc/router';
import SuperJSON from '$lib/superjson';
import { env } from '$env/dynamic/public';
import { toast } from 'svelte-sonner';
import { observable } from '@trpc/server/observable';
import { getErrorMessage, t } from './translation';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTrpcQueryProxy } from './createTrpcQueryProxy';

const backendUrl = (env.PUBLIC_BACKEND_BASE || '');

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
							toast.error(
								getErrorMessage(error.message) || getErrorMessage(error.code) || t.errors.default
							);
						}
					} catch (e) {
						if (Array.isArray(err)) {
							for (let error of err) {
								console.error(error);
								toast.error(getErrorMessage(error.message) || t.errors.default);
							}
						} else {
							console.error(err);
							toast.error(getErrorMessage(err.message) || t.errors.default);
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
export const trpc = createTRPCProxyClient<AppRouter>({
	links: [
		customLink,
		httpLink({
			url: backendUrl,
			transformer: SuperJSON,
			fetch: (url, options) => {
				return fetch(url, {
					...options,
					credentials: 'include'
				});
			}
		})
	]
});

export const trpcQuery = createTrpcQueryProxy<AppRouter>(trpc);

export const trpcS = createTRPCProxyClient<AppRouter>({
	links: [
		httpLink({
			url: backendUrl,
			transformer: SuperJSON,
			fetch: (url, options) => {
				return fetch(url, {
					...options,
					credentials: 'include'
				});
			}
		})
	]
});

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export type BranchType = RouterOutput['v1']['authenticated']['organization']['getBranches'][number];
export type CalendarType =
	RouterOutput['v1']['authenticated']['calendar']['getCalendar']['items'][number];
export type ServiceType = BranchType['services'][number];
export type MemberType = BranchType['members'][number];
