import { z } from 'zod';

export const protectedInputSchema = z.object({
  name: z.string(),
});

export const protectedOutputSchema = z.object({
  authenticated: z.boolean(),
});
