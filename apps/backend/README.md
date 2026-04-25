## Quick Start

### Development

```bash
npm install
npm run dev
```

### Deployment

```bash
npm run deploy
```

### Generate Cloudflare Types

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```

## Project Structure

See [docs/architecture/backend-structure.md](../../docs/architecture/backend-structure.md) for detailed folder organization and module purposes.

Quick overview:
```
src/
├── lib/              # Factories & configuration (app, auth, logger, db)
├── middleware/       # Request pipeline (env → logger → drizzle → auth → orpc)
├── routes/           # HTTP endpoints (auth, orpc, scalar documentation)
├── events/           # Global handlers (error, 404)
└── index.ts          # Cloudflare Worker entry point
```

## Architecture & Documentation

For developers (especially AI agents), consult these resources **before making changes**:

### Architecture Decisions
- [Factory Pattern](../../docs/adr/001-factory-pattern.md) — Why centralized app setup
- [ORPC Route Versioning](../../docs/adr/002-orpc-routing.md) — API versioning strategy

### Architecture Guides
- [Backend Structure Overview](../../docs/architecture/backend-structure.md) — Folder layout & module purposes
- [ORPC Routes Architecture](../../docs/architecture/orpc-routes.md) — Route handling, base classes, versioning
- [Middleware Flow](../../docs/architecture/middleware-flow.md) — Request pipeline & context binding
- [Type Safety & Avoiding `any`](../../docs/architecture/type-safety.md) — Type patterns, current issues to fix

### Patterns & Examples
- [Pattern Catalog](../../docs/patterns.md) — Middleware, handlers, factories, versioning patterns

## Key Principles

1. **Type Safety First**: No `any` types except where documented
2. **Middleware Order**: Matters! Env → Logger → Drizzle → Auth → ORPC → CORS
3. **Base Classes**: Routes inherit error specs & middleware via base pattern
4. **API Versioning**: Routes organized as v1, v2, etc. for future compatibility

## Type-Safe App Setup

```typescript
// src/index.ts - Cloudflare Worker entry point
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const app = createApp(env); // Fresh app per request

    // Mount route factories
    createBetterAuthRoutes(app);
    createORPCRoutes(app);
    createScalarRoutes(app);
    registerEvents(app);

    return app.fetch(request, env, ctx);
  }
};
```

## Known Issues to Fix

See [#43 - Zet documentatie-infrastructuur op](https://github.com/sentje-development/monorepo/issues/43):
- Remove `any` types from `src/lib/factory.ts` (orpcHandler, openapiHandler)
- Fix null coercion in `src/lib/auth.ts`
- Complete JSDoc comments for type hints

## Additional Resources

- [Hono Documentation](https://hono.dev/)
- [oRPC Documentation](https://orpc.dev/)
- [Better Auth](https://www.better-auth.com/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
