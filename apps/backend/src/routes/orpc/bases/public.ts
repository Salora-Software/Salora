import { oo } from '@orpc/openapi';
import { os } from '@orpc/server';
import type { HonoRequest } from 'hono';
import { z } from 'zod';

import type { AppBindings } from '@/lib/factory';

export const base = os.$context<{ var: AppBindings['Variables']; req: HonoRequest }>().errors({
	BAD_REQUEST: oo.spec(
		{
			status: 400,
			message: 'Input validation failed',
			data: z.object({
				issues: z.array(
					z.object({
						expected: z.string(),
						code: z.string(),
						path: z.array(z.string().or(z.number())),
					}),
				),
			}),
		},
		{
			description: 'Bad Request - Input validation failed',
		},
	),
	TOO_MANY_REQUESTS: oo.spec(
		{
			status: 429,
			message: 'Too Many Requests',
		},
		{
			description: 'Too Many Requests - Rate limit exceeded',
		},
	),
	FORBIDDEN: oo.spec(
		{
			status: 403,
			message: 'Forbidden',
		},
		{
			description: 'Forbidden - Access denied',
		},
	),
	NOT_FOUND: oo.spec(
		{
			status: 404,
			message: 'Not Found',
		},
		{
			description: 'Not Found - Resource not found',
		},
	),
	INTERNAL_SERVER_ERROR: oo.spec(
		{
			status: 500,
			message: 'Internal Server Error',
		},
		{
			description: 'Internal Server Error - Unexpected backend error',
		},
	),
});
