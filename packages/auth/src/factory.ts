import { generateRandomString } from "better-auth/crypto";
import { betterAuth, type AuthContext } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, openAPI, organization } from "better-auth/plugins";
import { schema, type DatabaseType } from "@salora/database";

// 1. Exporteer de factory-functie
export const createAuth = (db: DatabaseType, origin: string) => {
  // 3. Retourneer de Better Auth instance
  return betterAuth({
    baseURL: origin,
    emailAndPassword: {
      enabled: true,
      password: {
        hash: async (password) => {
          const encoder = new TextEncoder();
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"],
          );

          // 100.000 iteraties is een redelijke balans tussen veiligheid en de Worker limieten
          const hashBuffer = await crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt,
              iterations: 100000,
              hash: "SHA-256",
            },
            keyMaterial,
            256,
          );

          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const saltHex = Array.from(salt)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          return `${saltHex}:${hashHex}`;
        },
        verify: async ({ hash, password }) => {
          const [saltHex, originalHash] = hash.split(":") as [string, string];
          const salt = new Uint8Array(
            saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
          );
          const encoder = new TextEncoder();

          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"],
          );

          const hashBuffer = await crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt,
              iterations: 100000,
              hash: "SHA-256",
            },
            keyMaterial,
            256,
          );

          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const newHashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          return newHashHex === originalHash;
        },
      },
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      },
    },
    trustedOrigins: ["http://localhost:5173", origin],
    rateLimit: {
      enabled: true,
    },
    plugins: [
      openAPI(),
      organization({
        schema: {
          organization: {
            additionalFields: {
              onboardingStep: { type: "number" },
              location: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              website: { type: "string" },
              timeZone: { type: "string" },
            },
          },
        },
      }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          console.log("Sending magic link to:", email);
          console.log("Magic link URL:", url);
        },
        disableSignUp: true,
      }),
    ],
  });
};
