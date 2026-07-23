import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { orpcCustomJsonSerializers, type ORPCClient } from '@salora/shared-types';
import { toast } from 'svelte-sonner';
import { t } from './translation';
import { browser } from '$app/env';
import { env } from '$env/dynamic/public';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

const handleOrpcError = (err: any) => {
	try {
		if (err?.data?.issues) {
			// Zod error issues wrapper maybe?
			for (const issue of err.data.issues) {
				// @ts-ignore
				toast.error(t.errors[issue.message as keyof typeof t.errors] || t.errors.default);
			}
		} else if (err?.message) {
			let errors: { message: keyof typeof t.errors; code: keyof typeof t.errors }[];
			try {
				errors = JSON.parse(err.message);
				if (Array.isArray(errors)) {
					for (let error of errors) {
						// @ts-ignore
						toast.error(t.errors[error.message] || t.errors[error.code] || t.errors.default);
					}
					return;
				}
			} catch {
				// Ignore parse error
			}
			// @ts-ignore
			toast.error(t.errors[err.message as keyof typeof t.errors] || t.errors.default);
		} else {
			toast.error(t.errors.default);
		}
	} catch (e) {
		toast.error(t.errors.default);
	}
};

export const createOrpcClient = (backendUrl?: string): ORPCClient =>
	createORPCClient<ORPCClient>(
		new RPCLink({
			url: (backendUrl || (browser ? window.location.origin : '')) + '/orpc',
			customJsonSerializers: orpcCustomJsonSerializers,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
				try {
					const response = await fetch(input, {
						...init,
						credentials: 'include'
					});
					if (!response.ok) {
						const clone = response.clone();
						try {
							const errorJson = await clone.json();
							if (errorJson && errorJson.error) {
								handleOrpcError(errorJson.error);
							}
						} catch (e) {
							// fallback
						}
					}
					return response;
				} catch (err) {
					handleOrpcError(err);
					throw err;
				}
			}
		})
	);

export const orpc = createOrpcClient(env.PUBLIC_BACKEND_URL);

export type ORPCTanstackUtils = ReturnType<typeof createTanstackQueryUtils<typeof orpc>>;
export const orpcT: ORPCTanstackUtils = createTanstackQueryUtils(orpc);
