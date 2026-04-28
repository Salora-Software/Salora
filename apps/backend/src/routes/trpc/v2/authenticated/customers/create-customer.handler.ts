import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { schema } from '@salora/database';
import type { PrivateContext } from '@/middleware/trpc';
import type { CreateCustomerInput } from './create-customer.schema';

export const createCustomerHandler = async ({
	input: { organizationId, name, email, phone, address },
	ctx: { db, auth }
}: {
	input: CreateCustomerInput;
	ctx: PrivateContext;
}) => {
	const existingCustomer = await db.query.customer.findFirst({
		where: and(eq(schema.customer.organizationId, organizationId), eq(schema.customer.email, email))
	});

	const ctxAuth = await auth.$context;
	let user = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });

	if (!user) {
		try {
			user = await ctxAuth.internalAdapter.createUser({
				email,
				name,
				phone: phone || '',
				organizationId
			});
		} catch (error) {
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'customer_user_creation_failed'
			});
		}
	}

	if (existingCustomer) {
		const [updatedCustomer] = await db
			.update(schema.customer)
			.set({
				name,
				email,
				phone: phone || null,
				address: address || null,
				userId: user?.id ?? existingCustomer.userId ?? null
			})
			.where(eq(schema.customer.id, existingCustomer.id))
			.returning();

		if (!updatedCustomer) {
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'customer_update_failed'
			});
		}

		return { customer: updatedCustomer };
	}

	const [customer] = await db
		.insert(schema.customer)
		.values({
			id: crypto.randomUUID(),
			name,
			email,
			phone: phone || null,
			address: address || null,
			organizationId,
			userId: user?.id ?? null
		})
		.returning();

	if (!customer) {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'customer_create_failed'
		});
	}

	return { customer };
};
