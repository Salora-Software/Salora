import { router as createRouter, privateProcedure } from '../../../../context';
import { createCustomerHandler } from './create-customer.handler';
import { createCustomerSchema } from './create-customer.schema';
import { getCustomersHandler } from './get-customers.handler';
import { getCustomersSchema } from './get-customers.schema';

export const router = createRouter({
	getCustomers: privateProcedure.input(getCustomersSchema).query(async (opts) => {
		return await getCustomersHandler(opts);
	}),

	createCustomer: privateProcedure.input(createCustomerSchema).mutation(async (opts) => {
		return await createCustomerHandler(opts);
	})
});
