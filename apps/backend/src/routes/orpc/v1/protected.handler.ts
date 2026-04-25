import { protectedBase } from '../bases/protected';
import { protectedInputSchema, protectedOutputSchema } from './protected.schema';

export const protectedHandler = protectedBase
  .route({ method: 'GET' })
  .input(protectedInputSchema)
  .output(protectedOutputSchema)
  .handler(async ({ context: { var: { logger } } }) => {
    logger.debug(`Checking if service is alive`);

    return {
      authenticated: true,
    };
  });
