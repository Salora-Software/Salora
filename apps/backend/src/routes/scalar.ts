import { OpenAPIGenerator } from '@orpc/openapi';
import { ORPCError } from '@orpc/server';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';

import { router } from './orpc/_router';

import type { createRouter } from '@/lib/factory';

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [
		new ZodToJsonSchemaConverter(),
	],
});

export function createScalarRoutes(app: ReturnType<typeof createRouter>) {
	app.get('/docs/spec.json', async (c) => {
		if (c.var.env.NODE_ENV !== 'development') {
			throw new ORPCError('FORBIDDEN', {
				message: 'Access to API specification is restricted in production environment',
			});
		}
		const spec = await openAPIGenerator.generate(router, {
			info: {
				title: 'Salora Playground API',
				version: '1.0.0',
				description: 'A modern, type-safe API built with oRPC and Hono. Explore our endpoints for authentication, data management, and more.',
				contact: {
					name: 'Salora Team',
					email: 'support@salora.app',
					url: 'https://salora.app',
				},
				license: {
					name: 'AGPL-3.0-or-later',
					url: 'https://www.gnu.org/licenses/agpl-3.0.html',
				},
			},
			servers: [
				{ url: '/api' },
			],
		});

		return c.json(spec);
	});

	app.get('/docs', (c) => {
		if (c.var.env.NODE_ENV !== 'development') {
			throw new ORPCError('FORBIDDEN', {
				message: 'Access to API specification is restricted in production environment',
			});
		}

		const html = `
    <!doctype html>
    <html>
      <head>
        <title>Salora Playground API</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="https://orpc.dev/icon.svg" />
      </head>
      <body>
        <div id="app"></div>

        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        <script>
          Scalar.createApiReference('#app', {
           sources: [
              {
                title: 'Salora API',
                url: '/docs/spec.json',
                default: true 
              },
            //   {
            //     title: 'Better Auth API',
            //     url: '/auth/open-api/generate-schema'
            //   }
            ],
          })
        </script>
      </body>
    </html>
  `;
		return c.html(html);
	});
}
