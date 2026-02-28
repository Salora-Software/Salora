import DeepProxy from 'proxy-deep';
import { browser } from '$app/environment';
import type { AnyRouter } from '@trpc/server';
import type { TRPCClient } from '@trpc/client';
import { createQuery } from '@tanstack/svelte-query';
import { createMutation } from '@tanstack/svelte-query';
import type { CreateMutationResult } from '@tanstack/svelte-query';
import type { CreateMutationOptions } from '@tanstack/svelte-query';
import type { CreateQueryOptions } from '@tanstack/svelte-query';
import type { CreateQueryResult } from '@tanstack/svelte-query';

// Utility type to replace .query/.mutate with .createQuery/.createMutation
type ReplaceQueryMutation<T> = {
	[K in keyof T as K extends 'query'
		? 'createQuery'
		: K extends 'mutate'
			? 'createMutation'
			: K]: K extends 'query'
		? <
				TArgs = Parameters<Extract<T[K], (...args: any[]) => any>>[0],
				TData = Awaited<ReturnType<Extract<T[K], (...args: any[]) => any>>>,
				TError = unknown
			>(
				args?: TArgs,
				options?: Omit<CreateQueryOptions<TData, TError>, 'queryKey'> & { queryKey?: any }
			) => CreateQueryResult<TData, TError>
		: K extends 'mutate'
			? (<
					TArgs = Parameters<Extract<T[K], (...args: any[]) => any>>[0],
					TData = Awaited<ReturnType<Extract<T[K], (...args: any[]) => any>>>,
					TError = unknown
				>(
					args: TArgs,
					options: Omit<CreateMutationOptions<TData, TError, TArgs, unknown>, 'queryKey'>
				) => CreateMutationResult<TData, TError, TArgs, unknown>) &
					(<
						TArgs = Parameters<Extract<T[K], (...args: any[]) => any>>[0],
						TData = Awaited<ReturnType<Extract<T[K], (...args: any[]) => any>>>,
						TError = unknown
					>(
						options: Omit<CreateMutationOptions<TData, TError, TArgs, unknown>, 'queryKey'>
					) => CreateMutationResult<TData, TError, TArgs, unknown>)
			: T[K] extends object
				? ReplaceQueryMutation<T[K]>
				: T[K];
};

const isBrowser = () => browser;

export function createTrpcQueryProxy<TRouter extends AnyRouter>(
	client: TRPCClient<TRouter>
): ReplaceQueryMutation<TRPCClient<TRouter>> {
	let path: string[] = [];
	// DeepProxy handler to forward property access and method calls to the client
	const handler = {
		get(target: any, key: PropertyKey, receiver: any) {
			if (key === 'createQuery') {
				return <TArgs extends any[], TData = any, TError = unknown>(
					args?: TArgs,
					options: CreateQueryOptions<TData, TError> = {} as any
				) => {
					if (typeof target.query !== 'function') {
						throw new Error('No .query() method found on target');
					}
					// Build queryKey as the API path (property access chain) + args hash
					function hash(input: any): string {
						// Simple hash function for demonstration (FNV-1a)
						let str = typeof input === 'string' ? input : JSON.stringify(input);
						let hash = 2166136261;
						for (let i = 0; i < str.length; i++) {
							hash ^= str.charCodeAt(i);
							hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
						}
						return (hash >>> 0).toString(36);
					}
					const argsHash = args ? hash(args) : '';
					const basePath = path.length ? path : [key];
					const queryKey = options.queryKey || [...basePath, argsHash];
					const queryFn = options.queryFn || (() => target.query(args));
					const queryOptions: CreateQueryOptions<TData, TError> = {
						...options,
						queryKey,
						queryFn
					};
					path = [];

					if (!isBrowser()) {
						return {
							isLoading: true,
							data: undefined,
							error: undefined,
							status: 'pending'
						} as Partial<CreateQueryResult<any, unknown>>;
					}
					return createQuery<TData, TError>(() => queryOptions);
				};
			}
			if (key === 'createMutation') {
				return <TArgs = any, TData = any, TError = unknown>(...args: any[]) => {
					if (typeof target.mutate !== 'function') {
						throw new Error('No .mutate() method found on target');
					}
					let mutationArgs: TArgs | undefined;
					let options: CreateMutationOptions<TData, TError, TArgs, unknown> = {} as any;
					if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
						// Only options provided
						options = args[0];
					} else if (args.length === 2) {
						mutationArgs = args[0];
						options = args[1];
					}
					function hash(input: any): string {
						let str = typeof input === 'string' ? input : JSON.stringify(input);
						let hash = 2166136261;
						for (let i = 0; i < str.length; i++) {
							hash ^= str.charCodeAt(i);
							hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
						}
						return (hash >>> 0).toString(36);
					}
					const argsHash = mutationArgs ? hash(mutationArgs) : '';
					const mutationKey = [...path, argsHash];
					const mutationFn = options.mutationFn || ((variables: TArgs) => target.mutate(variables));
					const { mutationKey: _mutationKey, ...restOptions } = options;
					const mutationOptions: CreateMutationOptions<TData, TError, TArgs, unknown> = {
						...restOptions,
						mutationFn,
						mutationKey
					};
					path = [];
					if (!isBrowser()) {
						return {
							isLoading: true,
							data: undefined,
							error: undefined,
							status: 'pending'
						} as Partial<CreateQueryResult<any, unknown>>;
					}
					return createMutation<TData, TError, TArgs, unknown>(() => mutationOptions);
				};
			}
			const value = Reflect.get(target, key, receiver);
			path = [...path, String(key)];
			// Do not proxy native Promises
			if (
				value &&
				typeof value === 'object' &&
				typeof (value as any).then === 'function' &&
				typeof (value as any).catch === 'function'
			) {
				return value;
			}
			if (typeof value === 'object' && value !== null) {
				return new DeepProxy(value, handler);
			}
			if (typeof value === 'function') {
				return new DeepProxy(value, handler);
			}
			return value;
		},
		apply(target: any, thisArg: any, argumentsList: any[]) {
			const value = Reflect.apply(target, thisArg, argumentsList);
			return value;
		}
	};
	const proxy = new DeepProxy(client, handler);

	return proxy as ReplaceQueryMutation<TRPCClient<TRouter>>;
}
