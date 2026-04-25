import { generateRandomString } from "better-auth/crypto";
import type { Auth } from "./types";

export async function generateDirectMagicLink(
  auth: Auth,
  ctx: { email: string; name?: string; callback?: string },
) {
  const { email, name } = ctx;
  const token = generateRandomString(32, "a-z", "A-Z");
  const context = await auth.$context;

  await context.internalAdapter.createVerificationValue({
    identifier: token,
    value: JSON.stringify({ email, name }),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const baseUrl = auth.options.baseURL;
  // @ts-expect-error basePath is optioneel in de types, maar we hebben een default waarde in de factory
  const basePath = auth.options.basePath || "/api/auth";

  const magicLinkUrl = new URL(`${baseUrl}${basePath}/magic-link/verify`);
  magicLinkUrl.searchParams.set("token", token);
  magicLinkUrl.searchParams.set("callbackURL", ctx.callback || "/app");

  return magicLinkUrl.toString();
}
