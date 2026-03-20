import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Define the schema for public environment variables
const publicSchema = z.object({
	PUBLIC_BACKEND_URL : z.string().url().optional(),
	PUBLIC_CDN_URL : z.string().url().default('https://cdn.salora.app'),
	PUBLIC_FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

// Define the schema for private environment variables
const privateSchema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	// Mail Configuration
	MAIL_FALLBACK_SERVER: z.string().min(1, 'MAIL_FALLBACK_SERVER is required'),
	MAIL_FALLBACK_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
	MAIL_FALLBACK_USERNAME: z.string().min(1, 'MAIL_FALLBACK_USERNAME is required'),
	MAIL_FALLBACK_PASSWORD: z.string().min(1, 'MAIL_FALLBACK_PASSWORD is required'),
	MAIL_EMAIL_SENDER: z.string().email().optional(),
	// S3 Configuration
	ACCOUNT_ID: z.string().min(1, 'ACCOUNT_ID is required'),
	ACCESS_KEY_ID: z.string().min(1, 'ACCESS_KEY_ID is required'),
	SECRET_ACCESS_KEY: z.string().min(1, 'SECRET_ACCESS_KEY is required'),
	S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
	
	// Security
	TRUSTED_IPS: z.string().default('127.0.0.1,::1').transform((val) => val.split(',').map(ip => ip.trim())),
	
	// App Specific
	DEPLOY_TARGET: z.enum(['worker', 'node', 'docker']).default('node'),
});

// Combine schemas for server-side validation
const serverEnvSchema = privateSchema.merge(publicSchema);

// Parse and validate
const parseResult = serverEnvSchema.safeParse({ ...publicEnv, ...privateEnv });

if (!parseResult.success) {
	// In Cloudflare Workers, console.error shows up in logs
	console.error('❌ Invalid environment variables:', JSON.stringify(parseResult.error.format(), null, 4));
	throw new Error('Invalid environment variables: ' + parseResult.error.errors.map(e => e.message).join(', '));
}

export const env = parseResult.data;
