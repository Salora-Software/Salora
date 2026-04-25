/* eslint-disable ts/no-unsafe-argument */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/lib/factory';

describe('aPI Routering en oRPC flow', () => {
  it('oRPC alive endpoint retourneert 200 via HTTP', async () => {
    const app = createApp(env);
    // env injecteert de bindings uit wrangler.jsonc
    const res = await app.request('/api/orpc/v1/alive', {}, env);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
  });
});
