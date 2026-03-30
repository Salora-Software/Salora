import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, openAPI, organization } from 'better-auth/plugins';
import { createDb, schema } from '@salora/database'; // Importeer createDb i.p.v. db
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';

// 1. Exporteer de factory-functie
export const createAuth = (platform: App.Platform | undefined) => {
	if (!platform?.env?.DB) {
		throw new Error("Cloudflare D1 binding 'DB' ontbreekt in platform.env");
	}

	// 2. Initialiseer de database met de actuele binding
	const db = createDb(platform.env.DB);

	// 3. Retourneer de Better Auth instance
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
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
			env?.NODE_ENV === 'development' ? 'http://salora.app' : 'https://salora.app',
			envPublic?.PUBLIC_FRONTEND_URL
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
							onboardingStep: { type: 'number' },
							location: { type: 'string' },
							phone: { type: 'string' },
							email: { type: 'string' },
							website: { type: 'string' },
							timeZone: { type: 'string' }
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
};

// Exporteer het type zodat je dit in andere bestanden kunt gebruiken
export type Auth = ReturnType<typeof createAuth>;
