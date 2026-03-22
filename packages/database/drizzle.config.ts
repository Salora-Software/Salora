import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'sqlite',
	driver: "d1-http",
	schema: './src/db/schema.ts',
	out: './drizzle',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
		token: process.env.CLOUDFLARE_API_TOKEN!,		
	},
});
