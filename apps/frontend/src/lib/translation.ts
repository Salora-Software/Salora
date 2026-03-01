import { m } from '$lib/paraglide/messages.js';
import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js';

type MessageFn = (args?: Record<string, unknown>) => string;

const messageKeys = Object.keys(m);
const hasMessage = (id: string): boolean => typeof (m as Record<string, unknown>)[id] === 'function';

const formatMessage = (id: string, inputs?: Record<string, unknown>): string => {
	const fn = (m as Record<string, MessageFn | undefined>)[id];
	if (typeof fn === 'function') {
		return fn(inputs);
	}
	return id;
};

const childrenCache = new Map<string, string[]>();
const childKeys = (prefix: string): string[] => {
	if (childrenCache.has(prefix)) {
		return childrenCache.get(prefix)!;
	}
	const parts = prefix ? prefix.split('.') : [];
	const depth = parts.length;
	const children = new Set<string>();

	for (const key of messageKeys) {
		const segments = key.split('.');
		if (segments.length <= depth) continue;
		let matches = true;
		for (let i = 0; i < depth; i++) {
			if (segments[i] !== parts[i]) {
				matches = false;
				break;
			}
		}
		if (matches) {
			children.add(segments[depth]);
		}
	}

	const result = Array.from(children);
	childrenCache.set(prefix, result);
	return result;
};

const buildDays = (): Record<string | number, string | number> => {
	const map: Record<string | number, string | number> = {};

	for (let i = 1; i <= 7; i++) {
		const key = String(i);
		const name = formatMessage(`days.${key}`);
		map[key] = name;
		map[name] = i;
	}

	const altKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	altKeys.forEach((key, index) => {
		const id = `days.${key}`;
		if (hasMessage(id)) {
			const name = formatMessage(id);
			map[key] = name;
			map[name] = index + 1;
		}
	});

	return map;
};

const createNamespace = (prefix = ''): any =>
	new Proxy(
		{},
		{
			get(_, prop) {
				if (typeof prop === 'symbol') return undefined;
				const key = String(prop);

				if (!prefix && key === 'days') {
					return buildDays();
				}

				const id = prefix ? `${prefix}.${key}` : key;
				const fn = (m as Record<string, MessageFn | undefined>)[id];
				if (typeof fn === 'function') {
					return fn();
				}
				return createNamespace(id);
			},
			ownKeys() {
				if (!prefix) return childKeys('');
				if (prefix === 'days') return Object.keys(buildDays());
				return childKeys(prefix);
			},
			getOwnPropertyDescriptor(_, prop) {
				if (typeof prop === 'symbol') return undefined;
				const keys = prefix === 'days' ? Object.keys(buildDays()) : childKeys(prefix);
				if (keys.includes(String(prop))) {
					return { enumerable: true, configurable: true };
				}
			}
		}
	);

export const t = createNamespace();

const regexErrorMap = [{ pattern: /Unique constraint failed.*email/i, id: 'errors.regex.unique_email' }];

const findErrorId = (error: string): string | undefined => {
	const variants = [
		`errors.${error}`,
		`errors.${error.replace(/\s+/g, '_')}`,
		`errors.${error.toLowerCase()}`,
		`errors.${error.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')}`
	];

	for (const id of variants) {
		if (hasMessage(id)) return id;
	}
	return undefined;
};

export function getErrorMessage(error: string | { message: string }): string {
	const errorMessage = typeof error === 'string' ? error : error?.message ?? '';

	if (!errorMessage) {
		return formatMessage('errors.default');
	}

	const directMatch = findErrorId(errorMessage);
	if (directMatch) {
		return formatMessage(directMatch);
	}

	for (const { pattern, id } of regexErrorMap) {
		if (pattern.test(errorMessage) && hasMessage(id)) {
			return formatMessage(id);
		}
	}

	return formatMessage('errors.default');
}

export { getLocale, setLocale };
export const availableLocales = locales;
export const translate = formatMessage;
