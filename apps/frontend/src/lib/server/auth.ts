import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, openAPI, organization } from 'better-auth/plugins';
import { createDb, schema, type DatabaseType } from '@salora/database';

// 1. Exporteer de factory-functie
export const createAuth = (db: DatabaseType, origin: string) => {
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
			origin,
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
