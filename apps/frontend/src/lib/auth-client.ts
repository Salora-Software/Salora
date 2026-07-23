import { env } from '$env/dynamic/public';
import { magicLinkClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';

import { toast } from 'svelte-sonner';
import { t } from './translation';
export const { signIn, signUp, signOut, useSession, organization, magicLink, getSession } =
	createAuthClient({
		baseURL: new URL(env.PUBLIC_BACKEND_URL).origin + '/auth',
		fetchOptions: {
			onError: (error) => {
				const errorKey = typeof error.error.code === 'string' ? error.error.code : 'default';
				const errorMessages = t.errors as Record<string, unknown>;
				const errorMessage =
					typeof errorMessages[errorKey] === 'string'
						? (errorMessages[errorKey] as string)
						: error.error.message || 'An error occurred';
				console.log('Error in auth client:', error.error.code, errorMessage, errorKey);
				toast.error(errorMessage);
			}
		},
		plugins: [
			organizationClient({
				schema: {
					organization: {
						additionalFields: {
							onboardingStep: {
								type: 'number',
								nullable: true
							},
							location: {
								type: 'string',
								nullable: true
							},
							phone: {
								type: 'string',
								nullable: true
							},
							email: {
								type: 'string',
								nullable: true
							},
							website: {
								type: 'string',
								nullable: true
							},
							timeZone: {
								type: 'string',
								nullable: false
							}
						}
					}
				}
			}),
			magicLinkClient()
		]
	});
