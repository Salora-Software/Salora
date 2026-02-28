import { z } from 'zod';
import { TimeOffType } from '@salora/database';

export const addTimeOffSchema = z.object({
	organizationId: z.string(),
	memberId: z.string(),
	startTime: z.coerce.date(),
	endTime: z.coerce.date(),
	reason: z.string().optional(),
	type: z.nativeEnum(TimeOffType).default(TimeOffType.LEAVE)
});

export type AddTimeOffInput = z.infer<typeof addTimeOffSchema>;
