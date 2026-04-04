import { count, desc, eq, like, and, or, type SQL } from 'drizzle-orm';
import type { PrivateContext } from '$lib/server/trpc/context';
import { schema } from '@salora/database';
import type { GetCustomersInput } from './get-customers.schema';

export const getCustomersHandler = async ({
	input: { organizationId, skip, take, search },
	ctx: { db }
}: {
	input: GetCustomersInput;
	ctx: PrivateContext;
}) => {
	const whereClause: SQL[] = [
		eq(schema.customer.organizationId, organizationId),
		...(search && search.trim() !== ''
			? [
					or(
						like(schema.customer.name, `%${search}%`),
						like(schema.customer.email, `%${search}%`)
					) as SQL
				]
			: [])
	];

	const [customers, totalCount] = await Promise.all([
		db.query.customer.findMany({
			where: and(...whereClause),
			orderBy: [desc(schema.customer.createdAt)],
			offset: skip,
			limit: take,
			with: {
				bookings: {
					columns: {
						createdAt: true
					},
					orderBy: [desc(schema.booking.createdAt)]
				}
			}
		}),
		db
			.select({ value: count() })
			.from(schema.customer)
			.where(and(...whereClause))
			.then((rows) => rows[0]?.value ?? 0)
	]);

	const transformedCustomers = customers.map((customer) => ({
		id: customer.id,
		name: customer.name,
		email: customer.email,
		phone: customer.phone,
		createdAt: customer.createdAt,
		bookingCount: customer.bookings.length,
		lastBookingDate: customer.bookings.length > 0 ? customer.bookings[0].createdAt : null
	}));

	return {
		customers: transformedCustomers,
		totalCount: Number(totalCount)
	};
};
