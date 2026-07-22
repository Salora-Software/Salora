import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { orpcCustomJsonSerializers, type ORPCClient } from '@salora/shared-types';
import { toast } from 'svelte-sonner';
import { t } from './translation';

const DEFAULT_BACKEND_URL = 'http://localhost:5173';

const normalizeBackendUrl = (url?: string | null): string => {
	if (!url) return DEFAULT_BACKEND_URL;
	return url.replace(/\/$/, '');
};

const resolvedBackendUrl = normalizeBackendUrl();

const handleOrpcError = (err: any) => {
	try {
		if (err?.data?.issues) {
			// Zod error issues wrapper maybe?
			for (const issue of err.data.issues) {
				toast.error(t.errors[issue.message as keyof typeof t.errors] || t.errors.default);
			}
		} else if (err?.message) {
			let errors: { message: keyof typeof t.errors; code: keyof typeof t.errors }[];
			try {
				errors = JSON.parse(err.message);
				if (Array.isArray(errors)) {
					for (let error of errors) {
						toast.error(t.errors[error.message] || t.errors[error.code] || t.errors.default);
					}
					return;
				}
			} catch {
				// Ignore parse error
			}
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
			url: `${normalizeBackendUrl(backendUrl)}/orpc`,
			customJsonSerializers: orpcCustomJsonSerializers,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
				try {
					const response = await fetch(input, init);
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

export const orpc = createOrpcClient(resolvedBackendUrl);

export const orpcS: ORPCClient = createORPCClient<ORPCClient>(
	new RPCLink({
		url: `${resolvedBackendUrl}/orpc`,
		customJsonSerializers: orpcCustomJsonSerializers,
	})
); // Server fetch without toast

export const orpcOnServer = (fetchFn: typeof fetch, backendUrl?: string): ORPCClient =>
	createORPCClient<ORPCClient>(
		new RPCLink({
			url: `${normalizeBackendUrl(backendUrl ?? resolvedBackendUrl)}/orpc`,
			customJsonSerializers: orpcCustomJsonSerializers,
			fetch: fetchFn as any
		})
	);
