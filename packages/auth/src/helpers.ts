import type { AuthContext } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import type { Auth } from "./types";

export async function generateDirectMagicLink(authRef: Auth, email: string, name?: string) {
	const auth = authRef as unknown as AuthContext; // Cast naar AuthContext om toegang te krijgen tot internalAdapter
	const token = generateRandomString(32, "a-z", "A-Z");

	await auth.internalAdapter.createVerificationValue({
		identifier: token,
		value: JSON.stringify({ email, name }),
		expiresAt: new Date(Date.now() + 5 * 60 * 1000),
	});

	// 3. Bouw de URL op basis van je config
	const baseUrl = auth.options.baseURL;
	const basePath = auth.options.basePath || "/api/auth";

	const magicLinkUrl = new URL(`${baseUrl}${basePath}/magic-link/verify`);
	magicLinkUrl.searchParams.set("token", token);
	magicLinkUrl.searchParams.set("callbackURL", "/dashboard");

	return magicLinkUrl.toString();
}