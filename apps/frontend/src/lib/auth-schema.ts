import { z } from 'zod';
import { t } from './translation';

// `_password` starts with an underscore so Better Auth / SvelteKit never
// sends the submitted password back to the client (e.g. when re-rendering
// the form after a failed no-JS submission).
const email = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, t.login.validation.emailRequired)
	.pipe(z.email({ message: t.login.validation.emailInvalid }));

export const loginSchema = z.object({
	email,
	_password: z.string().min(1, t.login.validation.passwordRequired),
	redirectTo: z.string().optional()
});

export const registerSchema = z.object({
	name: z.string().trim().min(2, t.login.validation.nameRequired),
	email,
	_password: z.string().min(8, t.errors.PASSWORD_TOO_SHORT),
	redirectTo: z.string().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
