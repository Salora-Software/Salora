import { base } from '../bases/public';
import { aliveOutputSchema } from './alive.schema';

export const aliveHandler = base
  .route({ method: 'GET' })
  .output(aliveOutputSchema)
  .handler(async ({ context: { var: { logger } } }) => {
    logger.debug(`Checking if service is alive`);

    return {
      message: `Service is alive!`,
      time: new Date().toISOString(),
    };
  });
