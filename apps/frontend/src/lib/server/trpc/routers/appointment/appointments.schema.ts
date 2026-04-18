import { z } from 'zod';

export const getAppointmentsSchema = z.object({
	email: z.string().email().optional().or(z.literal('')),
	branchId: z.string()
});

export type GetAppointmentsInput = z.infer<typeof getAppointmentsSchema>;
