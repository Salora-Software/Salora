/// <reference path="../worker-configuration.d.ts" />
import type { Auth } from '@salora/auth';
import type { DatabaseType } from '@salora/database';
import type { EmailQueueMessage } from '@salora/mailer';

declare global {
	namespace App {
		// interface Error {}
		interface PageData {
			session: Session | null;
		}
		interface Locals {
			ip?: string;
			db: DatabaseType;
			auth: Auth;
			emailQueue?: Queue<EmailQueueMessage>;
		}
		// interface PageState {}
		interface Platform {
			env?: Env;
		}
	}
}
declare module 'next-auth' {
	/**
	 * The shape of the user object returned in the OAuth providers' `profile` callback,
	 * or the second parameter of the `session` callback, when using a database.
	 */
	interface User {}
	/**
	 * The shape of the account object returned in the OAuth providers' `account` callback,
	 * Usually contains information about the provider being used, like OAuth tokens (`access_token`, etc).
	 */
	interface Account {}

	/**
	 * Returned by `useSession`, `auth`, contains information about the active session.
	 */
	interface Session {}
}

import type { Cloudflare } from '@cloudflare/workers-types';
import { schema } from '@salora/database';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
// The `JWT` interface can be found in the `next-auth/jwt` submodule
import { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
	/** Returned by the `jwt` callback and `auth`, when using JWT sessions */
	interface JWT {
		/** OpenID ID Token */
		idToken?: string;
	}
}
