import { z } from 'zod';

export const aliveOutputSchema = z.object({
  message: z.string(),
  time: z.string(),
});
