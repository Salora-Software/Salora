import { z } from 'zod';

export const removeTimeOffSchema = z.object({
	organizationId: z.string(),
	timeOffId: z.string()
});

export type RemoveTimeOffInput = z.infer<typeof removeTimeOffSchema>;
