import { count, desc, eq, inArray, like, and, max, or, type SQL } from 'drizzle-orm';
import type { PrivateContext } from '@/middleware/trpc';
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
			limit: take
		}),
		db
			.select({ value: count() })
			.from(schema.customer)
			.where(and(...whereClause))
			.then((rows) => rows[0]?.value ?? 0)
	]);

	const customerIds = customers.map((customer) => customer.id);

	const bookingStats =
		customerIds.length > 0
			? await db
				.select({
					customerId: schema.booking.customerId,
					bookingCount: count(),
					lastBookingDate: max(schema.booking.createdAt)
				})
				.from(schema.booking)
				.where(inArray(schema.booking.customerId, customerIds))
				.groupBy(schema.booking.customerId)
			: [];

	const bookingStatsByCustomer = new Map(
		bookingStats.map((stats) => [stats.customerId, stats])
	);

	const transformedCustomers = customers.map((customer) => {
		const stats = bookingStatsByCustomer.get(customer.id);

		return {
			id: customer.id,
			name: customer.name,
			email: customer.email,
			phone: customer.phone,
			createdAt: customer.createdAt,
			bookingCount: stats?.bookingCount ?? 0,
			lastBookingDate: stats?.lastBookingDate ?? null
		};
	});

	return {
		customers: transformedCustomers,
		totalCount: Number(totalCount)
	};
};
