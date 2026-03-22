import { betterAuth } from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { prisma } from '$lib/server/prisma';
import { magicLink, openAPI, organization } from 'better-auth/plugins';
import { PUBLIC_FRONTEND_URL } from '$env/static/public';
import { db } from '@salora/database';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite' // or "mysql", "postgresql", ...etc
	}),
	emailAndPassword: {
		enabled: true
	},
	advanced: {
		ipAddress: {
			ipAddressHeaders: ['x-forwarded-for', 'x-real-ip']
		}
	},
	trustedOrigins: [
		'http://localhost:5173',
		process.env.NODE_ENV === 'development' ? 'http://dev.salora.app' : 'https://dev.salora.app',
		process.env.NODE_ENV === 'development' ? 'http://salora.app' : 'https://salora.app',
		PUBLIC_FRONTEND_URL.startsWith('https://') && process.env.NODE_ENV === 'development'
			? PUBLIC_FRONTEND_URL.replace(/^https:\/\//, 'http://')
			: PUBLIC_FRONTEND_URL
	],
	rateLimit: {
		enabled: true
	},
	plugins: [
		openAPI(),
		organization({
			schema: {
				organization: {
					additionalFields: {
						onboardingStep: {
							type: 'number'
						},
						location: {
							type: 'string'
						},
						phone: {
							type: 'string'
						},
						email: {
							type: 'string'
						},
						website: {
							type: 'string'
						},
						timeZone: {
							type: 'string'
						}
					}
				}
			}
		}),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				console.log('Sending magic link to:', email);
				console.log('Magic link URL:', url);
			},
			disableSignUp: true
		})
	]
});
