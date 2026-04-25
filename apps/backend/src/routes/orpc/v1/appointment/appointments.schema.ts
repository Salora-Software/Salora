import { z } from 'zod';

export const getAppointmentsInputSchema = z.object({
	email: z.string().email().optional().or(z.literal('')),
	branchId: z.string(),
});

export type GetAppointmentsInput = z.infer<typeof getAppointmentsInputSchema>;
