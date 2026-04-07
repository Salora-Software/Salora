import { router as createRouter, privateProcedure } from '../../../../context';
import { importAmeliaDataHandler } from './import.handler';
import { importAmeliaDataOutputSchema, importAmeliaDataSchema } from './import.schema';

export const router = createRouter({
	importAmeliaData: privateProcedure.input(importAmeliaDataSchema)
		.output(importAmeliaDataOutputSchema)
		.mutation(importAmeliaDataHandler)
});
