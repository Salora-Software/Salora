FROM oven/bun:latest

WORKDIR /app
COPY . .

# Install all monorepo dependencies so runtime imports are available.
RUN bun install --force

# Generate prisma client for workspace packages used by frontend.
RUN bun run --filter @salora/database generate

# Build frontend in the monorepo context.
RUN bun run turbo run build --filter=frontend

WORKDIR /app/apps/frontend
EXPOSE 5173
CMD ["bun", "run", "start"]