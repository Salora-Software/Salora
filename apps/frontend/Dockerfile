FROM oven/bun:latest AS base
WORKDIR /app
COPY . .
RUN bun install --force
RUN bunx prisma generate
RUN bun run build

WORKDIR /app
EXPOSE 5173
CMD ["bun", "start"]