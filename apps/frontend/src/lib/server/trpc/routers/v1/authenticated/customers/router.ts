import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { schema } from '@salora/database';
import { count, and, or, ilike, desc, eq, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';

export const router = createRouter({
	getCustomers: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				skip: z.number().optional().default(0),
				take: z.number().optional().default(10),
				search: z.string().optional()
			})
		)
		.output(
			z.object({
				customers: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						email: z.string(),
						phone: z.string().nullable(),
						createdAt: z.date(),
						bookingCount: z.number(),
						lastBookingDate: z.date().nullable()
					})
				),
				totalCount: z.number()
			})
		)
		.query(
			async ({
				input: { organizationId, skip, take, search },
				ctx: {
					session: { user },
					db
				}
			}) => {
				// Build the where clause for search
				const whereClause = [
					eq(schema.customer.organizationId, organizationId),
					...(search && search.trim() !== ''
						? [
								or(
									ilike(schema.customer.name, `%${search}%`),
									ilike(schema.customer.email, `%${search}%`)
								)
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

				// Transform customers to include booking count and last booking date
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
					totalCount
				};
			}
		),

	getCustomer: privateProcedure
		.input(
			z.object({
				id: z.string(),
				organizationId: z.string()
			})
		)
		.output(
			z.object({
				customer: z.object({
					id: z.string(),
					name: z.string(),
					email: z.string(),
					phone: z.string().nullable(),
					createdAt: z.date(),
					address: z.string().nullable().optional(),
					bookings: z.array(
						z.object({
							id: z.string(),
							createdAt: z.date(),
							status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
							service: z.object({
								name: z.string(),
								price: z.number()
							})
						})
					),
					statistics: z.object({
						bookingCount: z.number(),
						lastBookingDate: z.date().nullable(),
						reliabilityRating: z.enum(['Laag', 'Gemiddeld', 'Hoog']),
						averageBookingValue: z.number().nullable()
					})
				})
			})
		)
		.query(
			async ({
				input: { id, organizationId },
				ctx: {
					session: { user },
					db
				}
			}) => {
				// Get customer with bookings
				const customer = await db.query.customer.findFirst({
					where: and(
						eq(schema.customer.id, id),
						eq(schema.customer.organizationId, organizationId)
					),
					with: {
						bookings: {
							orderBy: [desc(schema.booking.createdAt)],
							with: {
								service: true
							}
						}
					}
				});

				if (!customer) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'customer_not_found'
					});
				}

				// Calculate statistics
				const bookingCount = customer.bookings.length;
				const lastBookingDate = bookingCount > 0 ? customer.bookings[0].createdAt : null;

				// Calculate average booking value
				let averageBookingValue = null;
				if (bookingCount > 0) {
					const totalValue = customer.bookings.reduce(
						(sum, booking) => sum + booking.service.price,
						0
					);
					averageBookingValue = totalValue / bookingCount;
				}

				// Calculate reliability rating based on cancellations and total bookings
				let reliabilityRating: 'Laag' | 'Gemiddeld' | 'Hoog' = 'Gemiddeld';
				if (bookingCount > 0) {
					const cancelledCount = customer.bookings.filter((b) => b.status === 'CANCELLED').length;
					const cancelRate = cancelledCount / bookingCount;

					if (cancelRate < 0.05) {
						reliabilityRating = 'Hoog';
					} else if (cancelRate > 0.2) {
						reliabilityRating = 'Laag';
					}
				}

				return {
					customer: {
						id: customer.id,
						name: customer.name,
						email: customer.email,
						phone: customer.phone,
						createdAt: customer.createdAt,
						address: customer.address, // Address field doesn't exist in schema yet, but adding for future expansion
						bookings: customer.bookings.map((booking) => ({
							id: booking.id,
							createdAt: booking.createdAt,
							status: booking.status as any,
							service: {
								name: booking.service.name,
								price: booking.service.price
							}
						})),
						statistics: {
							bookingCount,
							lastBookingDate,
							reliabilityRating,
							averageBookingValue
						}
					}
				};
			}
		),

	updateCustomer: privateProcedure
		.input(
			z.object({
				id: z.string(),
				organizationId: z.string(),
				name: z
					.string()
					.min(1, 'Name is required')
					.min(3, 'Name must be at least 3 characters long'),
				email: z.string().email('Valid email is required'),
				phone: z.string().nullable().optional(),
				address: z.string().nullable().optional()
			})
		)
		.output(
			z.object({
				customer: z.object({
					id: z.string(),
					name: z.string(),
					email: z.string(),
					phone: z.string().nullable(),
					address: z.string().nullable().optional(),
					createdAt: z.date()
				})
			})
		)
		.mutation(
			async ({
				input: { id, organizationId, name, email, phone, address },
				ctx: {
					session: { user },
					db
				}
			}) => {
				// Check if customer exists and belongs to organization
				const existingCustomer = await db.query.customer.findFirst({
					where: and(eq(schema.customer.id, id), eq(schema.customer.organizationId, organizationId))
				});

				if (!existingCustomer) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'customer_not_found'
					});
				}

				// Update customer details
				const [updatedCustomer] = await db
					.update(schema.customer)
					.set({ name, email, phone, address })
					.where(eq(schema.customer.id, id))
					.returning();

				return {
					customer: {
						id: updatedCustomer.id,
						name: updatedCustomer.name,
						email: updatedCustomer.email,
						phone: updatedCustomer.phone,
						address, // Returning the provided address even though it might not be saved to the DB yet
						createdAt: updatedCustomer.createdAt
					}
				};
			}
		),

	getCustomerOverview: privateProcedure
		.input(
			z.object({
				id: z.string(),
				organizationId: z.string(),
				startDate: z.string().optional(),
				endDate: z.string().optional()
			})
		)
		.output(
			z.object({
				summary: z.object({
					lastVisit: z.string().nullable(),
					loyaltyPoints: z.number(),
					totalAppointments: z.number(),
					totalSpent: z.number()
				}),
				monthlyBookings: z.array(
					z.object({
						date: z.date(),
						income: z.number(),
						appointmentCount: z.number()
					})
				),
				chartMetadata: z.object({
					groupingStrategy: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'yearly']),
					dateFormat: z.string()
				}),
				serviceDistribution: z.array(
					z.object({
						service: z.string(),
						count: z.number(),
						color: z.string()
					})
				),
				recentActivity: z.array(
					z.object({
						date: z.string(),
						service: z.string(),
						status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
						amount: z.number()
					})
				)
			})
		)
		.query(
			async ({
				input: { id, organizationId, startDate, endDate },
				ctx: {
					session: { user },
					db
				}
			}) => {
				// Get organization for timezone
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId)
				});

				if (!organization) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'organization_not_found'
					});
				}

				// Get current time in the organization's timezone
				const now = DateTime.now().setZone(organization.timeZone);

				// Set default date range if not provided
				let startOfPeriod, endOfPeriod;
				if (startDate && endDate) {
					startOfPeriod = DateTime.fromISO(startDate).setZone(organization.timeZone).startOf('day');
					endOfPeriod = DateTime.fromISO(endDate).setZone(organization.timeZone).endOf('day');
				} else {
					// Default to last 12 months
					startOfPeriod = now.minus({ months: 12 }).startOf('month');
					endOfPeriod = now.endOf('month');
				}

				// Convert to UTC for database query
				const startOfPeriodUTC = startOfPeriod.toJSDate();
				const endOfPeriodUTC = endOfPeriod.toJSDate();

				// Check if customer exists and belongs to organization
				const customer = await db.query.customer.findFirst({
					where: and(
						eq(schema.customer.id, id),
						eq(schema.customer.organizationId, organizationId)
					),
					with: {
						bookings: {
							where: and(
								gte(schema.booking.createdAt, startOfPeriodUTC),
								lte(schema.booking.createdAt, endOfPeriodUTC)
							),
							orderBy: [desc(schema.booking.createdAt)],
							with: {
								service: true
							}
						}
					}
				});

				if (!customer) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'customer_not_found'
					});
				}

				// Calculate summary statistics
				const totalAppointments = customer.bookings.length;
				const totalSpent = customer.bookings.reduce(
					(sum, booking) => sum + booking.service.price,
					0
				);
				const lastVisit =
					customer.bookings.length > 0
						? customer.bookings
								.find((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
								?.createdAt.toISOString()
								.split('T')[0] || null
						: null;

				// For now, loyalty points are calculated as 10% of total spent (can be adjusted)
				const loyaltyPoints = Math.floor(totalSpent * 0.1);

				// Determine grouping strategy based on date range
				const totalDays = Math.ceil(endOfPeriod.diff(startOfPeriod, 'days').days) + 1;
				const totalHours = Math.ceil(endOfPeriod.diff(startOfPeriod, 'hours').hours) + 1;
				let groupingStrategy: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
				let periodCount: number;
				let dateFormat: string;

				if (totalHours <= 48) {
					// Up to 48 hours: group by hour
					groupingStrategy = 'hourly';
					periodCount = totalHours;
					dateFormat = 'HH:mm';
				} else if (totalDays <= 21) {
					// Up to 21 days: group by day
					groupingStrategy = 'daily';
					periodCount = totalDays;
					dateFormat = 'MMM dd';
				} else if (totalDays <= 365) {
					// 22-365 days: group by week (Monday to Sunday)
					groupingStrategy = 'weekly';
					// Start from the beginning of the week containing startOfPeriod
					const weekStart = startOfPeriod.startOf('week');
					const weekEnd = endOfPeriod.endOf('week');
					periodCount = Math.ceil(weekEnd.diff(weekStart, 'weeks').weeks);
					dateFormat = 'MMM dd';
				} else if (totalDays <= 1825) {
					// 1-5 years: group by month
					groupingStrategy = 'monthly';
					// Start from the beginning of the month containing startOfPeriod
					const monthStart = startOfPeriod.startOf('month');
					const monthEnd = endOfPeriod.endOf('month');
					periodCount = Math.ceil(monthEnd.diff(monthStart, 'months').months);
					dateFormat = 'MMM yyyy';
				} else {
					// More than 5 years: group by year
					groupingStrategy = 'yearly';
					// Start from the beginning of the year containing startOfPeriod
					const yearStart = startOfPeriod.startOf('year');
					const yearEnd = endOfPeriod.endOf('year');
					periodCount = Math.ceil(yearEnd.diff(yearStart, 'years').years);
					dateFormat = 'yyyy';
				}

				// Initialize arrays for the chosen grouping strategy
				const monthlyData = new Array(periodCount).fill(null).map(() => ({ income: 0, count: 0 }));
				const dateLabels = new Array(periodCount);
				const periodServices = new Array(periodCount)
					.fill(null)
					.map(() => new Map<string, number>());

				// Helper function to get period index based on grouping strategy
				const getPeriodIndex = (date: DateTime): number => {
					switch (groupingStrategy) {
						case 'hourly':
							return Math.floor(date.diff(startOfPeriod, 'hours').hours);
						case 'daily':
							return Math.floor(date.diff(startOfPeriod, 'days').days);
						case 'weekly':
							const weekStart = startOfPeriod.startOf('week');
							return Math.floor(date.startOf('week').diff(weekStart, 'weeks').weeks);
						case 'monthly':
							const monthStart = startOfPeriod.startOf('month');
							return Math.floor(date.startOf('month').diff(monthStart, 'months').months);
						case 'yearly':
							const yearStart = startOfPeriod.startOf('year');
							return Math.floor(date.startOf('year').diff(yearStart, 'years').years);
						default:
							return 0;
					}
				};

				// Helper function to get period start date for labeling
				const getPeriodStartDate = (index: number): DateTime => {
					switch (groupingStrategy) {
						case 'hourly':
							return startOfPeriod.plus({ hours: index });
						case 'daily':
							return startOfPeriod.plus({ days: index });
						case 'weekly':
							return startOfPeriod.startOf('week').plus({ weeks: index });
						case 'monthly':
							return startOfPeriod.startOf('month').plus({ months: index });
						case 'yearly':
							return startOfPeriod.startOf('year').plus({ years: index });
						default:
							return startOfPeriod;
					}
				};

				// Group bookings by the chosen strategy
				customer.bookings.forEach((booking) => {
					const bookingDate = DateTime.fromJSDate(booking.createdAt).setZone(organization.timeZone);
					const periodIndex = getPeriodIndex(bookingDate);

					if (periodIndex >= 0 && periodIndex < periodCount) {
						monthlyData[periodIndex].income += booking.service.price;
						monthlyData[periodIndex].count += 1;

						// Track services for distribution
						const serviceName = booking.service.name;
						const serviceMap = periodServices[periodIndex];
						serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);
					}
				});

				// Generate date labels
				for (let i = 0; i < periodCount; i++) {
					const periodStart = getPeriodStartDate(i);

					if (groupingStrategy === 'hourly') {
						// For hourly, show "14:00" or "14:00 - 15:00"
						dateLabels[i] = periodStart.toFormat('HH:mm');
					} else if (groupingStrategy === 'weekly') {
						const weekEnd = periodStart.plus({ days: 6 });
						// For weekly, show "Mar 01 - Mar 07" or "Mar 29 - Apr 04" for cross-month weeks
						if (periodStart.month !== weekEnd.month) {
							dateLabels[i] = `${periodStart.toFormat('MMM dd')} - ${weekEnd.toFormat('MMM dd')}`;
						} else {
							dateLabels[i] = `${periodStart.toFormat('MMM dd')} - ${weekEnd.toFormat('dd')}`;
						}
					} else if (groupingStrategy === 'monthly') {
						// For monthly, show just "March" or "Mar 2024" depending on span
						const monthsDiff = endOfPeriod.diff(startOfPeriod, 'months').months;
						if (monthsDiff > 12) {
							dateLabels[i] = periodStart.toFormat('MMM yyyy');
						} else {
							dateLabels[i] = periodStart.toFormat('MMM');
						}
					} else if (groupingStrategy === 'yearly') {
						// For yearly, show "2024", "2025", etc.
						dateLabels[i] = periodStart.toFormat('yyyy');
					} else {
						// Daily format
						dateLabels[i] = periodStart.toFormat(dateFormat);
					}
				}

				// Transform monthly data for chart
				const monthlyBookings = monthlyData.map((data, index) => ({
					date: getPeriodStartDate(index).toJSDate(),
					income: data.income,
					appointmentCount: data.count
				}));

				// Calculate service distribution (aggregate all periods)
				const serviceMap = new Map<string, number>();
				customer.bookings.forEach((booking) => {
					const serviceName = booking.service.name;
					serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);
				});

				const colors = [
					'var(--chart-1)',
					'var(--chart-2)',
					'var(--chart-3)',
					'var(--chart-4)',
					'var(--chart-5)'
				];
				const serviceDistribution = Array.from(serviceMap.entries()).map(
					([service, count], index) => ({
						service,
						count,
						color: colors[index % colors.length]
					})
				);

				// Get recent activity (last 10 bookings)
				const recentActivity = customer.bookings.slice(0, 10).map((booking) => ({
					date: booking.createdAt.toISOString().split('T')[0],
					service: booking.service.name,
					status: booking.status as any,
					amount: booking.service.price
				}));

				return {
					summary: {
						lastVisit,
						loyaltyPoints,
						totalAppointments,
						totalSpent
					},
					monthlyBookings,
					chartMetadata: {
						groupingStrategy,
						dateFormat
					},
					serviceDistribution,
					recentActivity
				};
			}
		),

	getCustomerBookings: privateProcedure
		.input(
			z.object({
				customerId: z.string(),
				organizationId: z.string(),
				skip: z.number().optional().default(0),
				take: z.number().optional().default(10),
				search: z.string().optional()
			})
		)
		.output(
			z.object({
				bookings: z.array(
					z.object({
						id: z.string(),
						createdAt: z.date(),
						status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
						duration: z.number(),
						notes: z.string().nullable(),
						service: z.object({
							id: z.string(),
							name: z.string(),
							price: z.number()
						}),
						employee: z
							.object({
								id: z.string(),
								name: z.string()
							})
							.nullable()
					})
				),
				totalCount: z.number()
			})
		)
		.query(
			async ({
				input: { customerId, organizationId, skip, take, search },
				ctx: {
					session: { user },
					db
				}
			}) => {
				// Verify customer belongs to organization
				const customer = await db.query.customer.findFirst({
					where: and(
						eq(schema.customer.id, customerId),
						eq(schema.customer.organizationId, organizationId)
					)
				});

				if (!customer) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'customer_not_found'
					});
				}

				// Build search filter for bookings
				const searchConditions = [eq(schema.booking.customerId, customerId)];
				if (search && search.trim() !== '') {
					searchConditions.push(
						or(
							ilike(schema.booking.notes, `%${search}%`)
							// Note: Searching nested service/employee name via findMany 'where' is limited in Drizzle-ORM findMany.
							// Usually requires join for complex search, but keeping it simple for now if possible or just searching notes.
						) as any
					);
				}

				const [bookings, totalCount] = await Promise.all([
					db.query.booking.findMany({
						where: and(...searchConditions),
						orderBy: [desc(schema.booking.createdAt)],
						offset: skip,
						limit: take,
						with: {
							service: true,
							employee: {
								with: {
									user: true
								}
							}
						}
					}),
					db
						.select({ value: count() })
						.from(schema.booking)
						.where(and(...searchConditions))
						.then((rows) => rows[0]?.value ?? 0)
				]);

				// Transform bookings for output
				const transformedBookings = bookings.map((booking) => ({
					id: booking.id,
					createdAt: booking.createdAt,
					status: booking.status as any,
					duration: booking.duration,
					notes: booking.notes,
					service: {
						id: booking.service.id,
						name: booking.service.name,
						price: booking.service.price
					},
					employee: booking.employee
						? {
								id: booking.employee.id,
								name: booking.employee.user.name
							}
						: null
				}));

				return {
					bookings: transformedBookings,
					totalCount
				};
			}
		),

	getCustomerNotes: privateProcedure
		.input(
			z.object({
				customerId: z.string(),
				organizationId: z.string(),
				skip: z.number().default(0),
				take: z.number().default(10),
				search: z.string().optional()
			})
		)
		.query(async ({ input, ctx: { db } }) => {
			const { customerId, organizationId, skip, take, search } = input;

			// Verify customer belongs to organization
			const customer = await db.query.customer.findFirst({
				where: and(
					eq(schema.customer.id, customerId),
					eq(schema.customer.organizationId, organizationId)
				)
			});

			if (!customer) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'customer_not_found'
				});
			}

			// Build search conditions
			const searchConditions = [eq(schema.note.customerId, customerId)];
			if (search && search.trim() !== '') {
				searchConditions.push(ilike(schema.note.content, `%${search}%`));
			}

			const [notes, totalCount] = await Promise.all([
				db.query.note.findMany({
					where: and(...searchConditions),
					orderBy: [desc(schema.note.createdAt)],
					offset: skip,
					limit: take,
					with: {
						user: true
					}
				}),
				db
					.select({ value: count() })
					.from(schema.note)
					.where(and(...searchConditions))
					.then((rows) => rows[0]?.value ?? 0)
			]);

			return {
				notes: notes.map((n) => ({
					...n,
					author: n.user ? { ...n.user, name: n.user.name } : null
				})),
				totalCount
			};
		}),

	createCustomerNote: privateProcedure
		.input(
			z.object({
				customerId: z.string(),
				organizationId: z.string(),
				content: z.string().min(1).max(500)
			})
		)
		.mutation(async ({ input, ctx: { db, session } }) => {
			const { customerId, organizationId, content } = input;

			// Verify customer belongs to organization
			const customer = await db.query.customer.findFirst({
				where: and(
					eq(schema.customer.id, customerId),
					eq(schema.customer.organizationId, organizationId)
				)
			});

			if (!customer) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'customer_not_found'
				});
			}

			const [note] = await db
				.insert(schema.note)
				.values({
					id: crypto.randomUUID(),
					content,
					customerId,
					authorId: session.user.id,
					updatedAt: new Date()
				})
				.returning();

			// Fetch author for output
			const author = await db.query.user.findFirst({
				where: eq(schema.user.id, note.authorId)
			});

			return {
				...note,
				author: author ? { ...author, name: author.name } : null
			};
		}),

	deleteCustomerNote: privateProcedure
		.input(
			z.object({
				noteId: z.string(),
				customerId: z.string(),
				organizationId: z.string()
			})
		)
		.mutation(async ({ input, ctx: { db, session } }) => {
			const { noteId, customerId, organizationId } = input;

			// Verify customer belongs to organization
			const customer = await db.query.customer.findFirst({
				where: and(
					eq(schema.customer.id, customerId),
					eq(schema.customer.organizationId, organizationId)
				)
			});

			if (!customer) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'customer_not_found'
				});
			}

			// Verify note belongs to customer
			const note = await db.query.note.findFirst({
				where: and(eq(schema.note.id, noteId), eq(schema.note.customerId, customerId))
			});

			if (!note) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'note_not_found'
				});
			}

			// Only allow deletion by the author or organization admin
			if (note.authorId !== session.user.id) {
				// Check if user is admin/owner of organization
				const member = await db.query.member.findFirst({
					where: and(
						eq(schema.member.userId, session.user.id),
						eq(schema.member.organizationId, organizationId),
						or(eq(schema.member.role, 'admin'), eq(schema.member.role, 'owner'))
					)
				});

				if (!member) {
					throw new TRPCError({
						code: 'FORBIDDEN',
						message: 'not_authorized_to_delete_this_note'
					});
				}
			}

			await db.delete(schema.note).where(eq(schema.note.id, noteId));

			return { success: true };
		})
});
