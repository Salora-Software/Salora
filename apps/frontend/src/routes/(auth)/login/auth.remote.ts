import { form, getRequestEvent } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { loginSchema, registerSchema } from '$lib/auth-schema';
import { t } from '$lib/translation';

type AuthError = { code?: string; message?: string };

/**
 * The Better Auth API is served by the same worker (`/api/auth/*`). By calling
 * it through `event.fetch`, request cookies are forwarded and the `Set-Cookie`
 * headers from the auth response (the session cookie) are applied to the
 * response of this remote function, so both the JS-enhanced and the no-JS
 * (progressively enhanced) submission flows end up with a valid session.
 */
async function postJson(path: string, body: Record<string, unknown>): Promise<Response> {
	const event = getRequestEvent();
	const headers = new Headers({ 'content-type': 'application/json' });
	const ip = clientIp();
	if (ip) headers.set('x-forwarded-for', ip);

	return event.fetch(path, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
}

/** Better Auth rate limiting keys on the caller IP — forward the real client IP. */
function clientIp(): string | undefined {
	const event = getRequestEvent();

	const connectingIp = event.request.headers.get('cf-connecting-ip');
	if (connectingIp) return connectingIp;

	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]?.trim();

	try {
		return event.getClientAddress();
	} catch {
		return undefined;
	}
}

async function readAuthError(response: Response): Promise<AuthError> {
	try {
		const body = (await response.json()) as AuthError;
		if (body && typeof body === 'object') return body;
	} catch {
		// not JSON, fall through to the generic message
	}
	return {};
}

function authErrorMessage(status: number, { code, message }: AuthError): string {
	const errors = t.errors as Record<string, string>;
	if (status === 429) return errors.too_many_requests;
	if (code && errors[code]) return errors[code];
	return message || errors.default;
}

/** Only allow same-origin redirects, to prevent open redirects via `?redirectTo=`. */
function safeRedirect(target: string | undefined): string {
	if (target && target.startsWith('/') && !target.startsWith('//')) return target;
	return '/';
}

export const login = form(loginSchema, async (data, issue) => {
	const response = await postJson('/api/auth/sign-in/email', {
		email: data.email,
		password: data._password
	});

	if (!response.ok) {
		const error = await readAuthError(response);
		const message = authErrorMessage(response.status, error);

		if (error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error.code === 'INVALID_EMAIL') {
			invalid(issue.email(message));
		}

		invalid(message);
	}

	redirect(303, safeRedirect(data.redirectTo));
});

export const register = form(registerSchema, async (data, issue) => {
	const response = await postJson('/api/auth/sign-up/email', {
		name: data.name,
		email: data.email,
		password: data._password
	});

	if (!response.ok) {
		const error = await readAuthError(response);
		const message = authErrorMessage(response.status, error);

		if (error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error.code === 'INVALID_EMAIL') {
			invalid(issue.email(message));
		}

		invalid(message);
	}

	redirect(303, safeRedirect(data.redirectTo));
});
