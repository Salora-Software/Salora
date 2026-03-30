import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, openAPI, organization } from 'better-auth/plugins';
import { PUBLIC_FRONTEND_URL } from '$env/static/public';
import { db, schema } from '@salora/database';
import { env } from '$env/dynamic/private';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite', // or "mysql", "postgresql", ...etc
		schema
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
		env?.NODE_ENV === 'development' ? 'http://dev.salora.app' : 'https://dev.salora.app',
		env?.NODE_ENV === 'development' ? 'http://salora.app' : 'https://salora.app'
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
