import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '$lib/server/prisma';
import { magicLink, openAPI, organization } from 'better-auth/plugins';
import { env } from '$lib/server/env';

const isWorkerTarget = process.env.DEPLOY_TARGET === 'worker';
const nodeEnv = process.env.NODE_ENV || 'production';

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: isWorkerTarget ? 'sqlite' : 'postgresql'
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
		env.PUBLIC_FRONTEND_URL.startsWith('https://') && process.env.NODE_ENV === 'development'
			? env.PUBLIC_FRONTEND_URL.replace(/^https:\/\//, 'http://')
			: env.PUBLIC_FRONTEND_URL
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
