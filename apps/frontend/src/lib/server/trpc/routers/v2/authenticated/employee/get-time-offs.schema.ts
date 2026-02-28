import { z } from 'zod';

export const getTimeOffsSchema = z.object({
	organizationId: z.string(),
	memberId: z.string()
});

export type GetTimeOffsInput = z.infer<typeof getTimeOffsSchema>;
