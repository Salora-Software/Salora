cd packages/database
npx wrangler d1 execute DB --remote --env prod --file=./safe-migration.sql
bun db:push
