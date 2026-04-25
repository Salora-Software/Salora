import type { AnyD1Database } from 'drizzle-orm/d1';
import type { EmailQueueMessage } from '@salora/mailer';
import { z } from 'zod';

const envSchema = z.object({
	LOG_LEVEL: z
		.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
		.default('info'),
	DB: z.any(),
	EMAIL_QUEUE: z.any().optional(),
	// todo: do we want a default value for this? Im scared of accidentally forgetting and deploying to prod with development env
	NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema> & {
	DB_DEV?: AnyD1Database;
	DB?: AnyD1Database;
	EMAIL_QUEUE?: Queue<EmailQueueMessage>;
};

export function parseEnv(env: Record<string, unknown>) {
	const validated = envSchema.safeParse(env);

	if (!validated.success) {
		// we cant use logger here cause it will circular dep
		throw new Error(
			`Invalid environment variables:\n${validated.error.issues
				.map(i => `${i.path.map(String).join('.')} - ${i.message}`)
				.join('\n')}`,
		);
	}

	return validated.data;
}
