import { z } from 'zod';

export const importAmeliaDataSchema = z.object({
	organizationId: z.string()
});

export type ImportAmeliaDataInput = z.infer<typeof importAmeliaDataSchema>;

export const importAmeliaDataOutputSchema = z.object({
	customersImported: z.number(),
	servicesImported: z.number(),
	bookingsImported: z.number(),
	message: z.string()
});

export type ImportAmeliaDataOutput = z.infer<typeof importAmeliaDataOutputSchema>;
