import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { prisma } from '$lib/server/prisma';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';

export const router = createRouter({
	getUpcomingAppointments: privateProcedure
		.input(
			z
				.object({
					organizationId: z.string().optional(),
					startDate: z.string().optional(),
					endDate: z.string().optional()
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const organizationId = input?.organizationId || ctx.session.session.activeOrganizationId;
			let branch = await prisma.organization.findFirst({
				where: {
					id: organizationId!
				},
				include: {
					members: {
						include: {
							user: true
						}
					}
				}
			});
			if (!branch) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}

			// Get current time in the organization's timezone
			const now = DateTime.now().setZone(branch.timeZone);

			// Use provided date range or default to today
			let startTime, endTime;
			if (input?.startDate && input?.endDate) {
				startTime = DateTime.fromISO(input.startDate).setZone(branch.timeZone).startOf('day');
				endTime = DateTime.fromISO(input.endDate).setZone(branch.timeZone).endOf('day');
			} else {
				startTime = now.startOf('day');
				endTime = now.endOf('day');
			}

			// Convert to UTC for database query
			const startTimeUTC = startTime.toJSDate();
			const endTimeUTC = endTime.toJSDate();

			// Query appointments for the selected date range
			const appointments = await prisma.calendarItem.findMany({
				where: {
					organizationId: organizationId!,
					startTime: {
						gte: startTimeUTC,
						lte: endTimeUTC
					}
				},
				include: {
					member: {
						include: {
							user: true
						}
					},
					booking: {
						include: {
							customer: true
						}
					}
				},
				orderBy: {
					startTime: 'asc'
				},
				take: 1000 // Limit to 1000 appointments to prevent performance issues
			});

			// Transform appointments to include customer info at the top level
			const appointmentsWithCustomer = appointments.map((appointment) => {
				const localStartTime = DateTime.fromJSDate(appointment.startTime).setZone(branch.timeZone);
				const localEndTime = DateTime.fromJSDate(appointment.endTime).setZone(branch.timeZone);

				return {
					...appointment,
					localStartTime: localStartTime.toISO(),
					localEndTime: localEndTime.toISO(),
					customer: appointment.booking?.customer || null
				};
			});

			return {
				organizationId,
				timeZone: branch.timeZone,
				currentLocalTime: now.toISO(),
				dateRange: {
					start: startTime.toISO(),
					end: endTime.toISO()
				},
				appointments: appointmentsWithCustomer
			};
		}),

	getDashboardStats: privateProcedure
		.input(
			z
				.object({
					organizationId: z.string().optional(),
					startDate: z.string().optional(),
					endDate: z.string().optional()
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const organizationId = input?.organizationId || ctx.session.session.activeOrganizationId;
			let branch = await prisma.organization.findFirst({
				where: {
					id: organizationId!
				}
			});
			if (!branch) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}

			// Get current time in the organization's timezone
			const now = DateTime.now().setZone(branch.timeZone);

			// Use provided date range or default to current month
			let startOfPeriod, endOfPeriod, startOfLastPeriod, endOfLastPeriod;
			if (input?.startDate && input?.endDate) {
				startOfPeriod = DateTime.fromISO(input.startDate).setZone(branch.timeZone).startOf('day');
				endOfPeriod = DateTime.fromISO(input.endDate).setZone(branch.timeZone).endOf('day');

				// Calculate the same period length in the past for comparison
				const periodLength = endOfPeriod.diff(startOfPeriod, 'days').days;
				endOfLastPeriod = startOfPeriod.minus({ days: 1 }).endOf('day');
				startOfLastPeriod = endOfLastPeriod.minus({ days: periodLength }).startOf('day');
			} else {
				startOfPeriod = now.startOf('month');
				endOfPeriod = now.endOf('month');
				startOfLastPeriod = startOfPeriod.minus({ months: 1 });
				endOfLastPeriod = endOfPeriod.minus({ months: 1 });
			}

			// Convert to UTC for database queries
			const startOfPeriodUTC = startOfPeriod.toJSDate();
			const endOfPeriodUTC = endOfPeriod.toJSDate();
			const startOfLastPeriodUTC = startOfLastPeriod.toJSDate();
			const endOfLastPeriodUTC = endOfLastPeriod.toJSDate();

			// Execute all database queries in parallel for better performance
			const [
				currentPeriodBookings,
				lastPeriodBookings,
				newCustomersThisPeriod,
				newCustomersLastPeriod,
				returningCustomers
			] = await Promise.all([
				// Get current period bookings with minimal data
				prisma.booking.findMany({
					where: {
						organizationId: organizationId!,
						createdAt: {
							gte: startOfPeriodUTC,
							lte: endOfPeriodUTC
						}
					},
					select: {
						id: true,
						createdAt: true,
						customerId: true,
						status: true,
						service: {
							select: {
								price: true
							}
						}
					},
					take: 5000
				}),

				// Get last period bookings with minimal data
				prisma.booking.findMany({
					where: {
						organizationId: organizationId!,
						createdAt: {
							gte: startOfLastPeriodUTC,
							lte: endOfLastPeriodUTC
						}
					},
					select: {
						id: true,
						status: true,
						service: {
							select: {
								price: true
							}
						}
					},
					take: 5000
				}),

				// Get new customers this period
				prisma.customer.findMany({
					where: {
						organizationId: organizationId!,
						createdAt: {
							gte: startOfPeriodUTC,
							lte: endOfPeriodUTC
						}
					},
					select: {
						id: true,
						createdAt: true
					}
				}),

				// Get new customers last period
				prisma.customer.count({
					where: {
						organizationId: organizationId!,
						createdAt: {
							gte: startOfLastPeriodUTC,
							lte: endOfLastPeriodUTC
						}
					}
				}),

				// Get returning customers count
				prisma.customer.count({
					where: {
						organizationId: organizationId!,
						bookings: {
							some: {
								createdAt: {
									lt: startOfPeriodUTC
								}
							}
						}
					}
				})
			]);

			// Calculate unique customers this period efficiently
			const uniqueCustomerIds = new Set(currentPeriodBookings.map((booking) => booking.customerId));
			const totalCustomersThisPeriod = uniqueCustomerIds.size;

			// Calculate unique customers last period efficiently
			const lastPeriodUniqueCustomers = await prisma.booking.findMany({
				where: {
					organizationId: organizationId!,
					createdAt: {
						gte: startOfLastPeriodUTC,
						lte: endOfLastPeriodUTC
					}
				},
				select: {
					customerId: true
				},
				distinct: ['customerId']
			});
			const totalCustomersLastPeriod = lastPeriodUniqueCustomers.length;

			// Calculate revenue efficiently - only include CONFIRMED and COMPLETED bookings
			const currentPeriodRevenue = currentPeriodBookings
				.filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
				.reduce((sum, booking) => sum + booking.service.price, 0);
			const lastPeriodRevenue = lastPeriodBookings
				.filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
				.reduce((sum, booking) => sum + booking.service.price, 0);

			// Calculate percentage changes
			const appointmentChange =
				lastPeriodBookings.length > 0
					? ((currentPeriodBookings.length - lastPeriodBookings.length) /
							lastPeriodBookings.length) *
						100
					: 100;
			const revenueChange =
				lastPeriodRevenue > 0
					? ((currentPeriodRevenue - lastPeriodRevenue) / lastPeriodRevenue) * 100
					: 100;
			const customerChange =
				totalCustomersLastPeriod > 0
					? ((totalCustomersThisPeriod - totalCustomersLastPeriod) / totalCustomersLastPeriod) * 100
					: 100;
			const newCustomerChange =
				newCustomersLastPeriod > 0
					? ((newCustomersThisPeriod.length - newCustomersLastPeriod) / newCustomersLastPeriod) *
						100
					: 100; // Determine grouping strategy based on date range
			const totalDays = Math.ceil(endOfPeriod.diff(startOfPeriod, 'days').days) + 1;
			let groupingStrategy: 'daily' | 'weekly' | 'monthly' | 'yearly';
			let periodCount: number;
			let dateFormat: string;

			if (totalDays <= 21) {
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
			const bookingsByPeriod = new Array(periodCount).fill(0);
			const revenueByPeriod = new Array(periodCount).fill(0);
			const customersByPeriod = new Array(periodCount).fill(0);
			const newCustomersByPeriod = new Array(periodCount).fill(0);
			const dateLabels = new Array(periodCount);
			const periodCustomers = new Array(periodCount).fill(null).map(() => new Set());

			// Helper function to get period index based on grouping strategy
			const getPeriodIndex = (date: DateTime): number => {
				switch (groupingStrategy) {
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

			// Group current period bookings by the chosen strategy
			for (const booking of currentPeriodBookings) {
				const bookingDate = DateTime.fromJSDate(booking.createdAt).setZone(branch.timeZone);
				const periodIndex = getPeriodIndex(bookingDate);

				if (periodIndex >= 0 && periodIndex < periodCount) {
					bookingsByPeriod[periodIndex]++;
					// Only add revenue for CONFIRMED or COMPLETED bookings
					if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
						revenueByPeriod[periodIndex] += booking.service.price;
					}
					periodCustomers[periodIndex].add(booking.customerId);
				}
			}

			// Group new customers by the chosen strategy
			for (const customer of newCustomersThisPeriod) {
				const customerDate = DateTime.fromJSDate(customer.createdAt).setZone(branch.timeZone);
				const periodIndex = getPeriodIndex(customerDate);

				if (periodIndex >= 0 && periodIndex < periodCount) {
					newCustomersByPeriod[periodIndex]++;
				}
			}

			// Generate date labels and customer counts
			for (let i = 0; i < periodCount; i++) {
				const periodStart = getPeriodStartDate(i);

				if (groupingStrategy === 'weekly') {
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

				customersByPeriod[i] = periodCustomers[i].size;
			}

			return {
				organizationId,
				timeZone: branch.timeZone,
				currentLocalTime: now.toISO(),
				dateRange: {
					start: startOfPeriod.toISO(),
					end: endOfPeriod.toISO()
				},
				stats: {
					appointments: {
						current: currentPeriodBookings.length,
						change: Math.round(appointmentChange)
					},
					revenue: {
						current: currentPeriodRevenue,
						change: Math.round(revenueChange)
					},
					customers: {
						current: totalCustomersThisPeriod,
						change: Math.round(customerChange)
					},
					newCustomers: {
						current: newCustomersThisPeriod.length,
						change: Math.round(newCustomerChange)
					}
				},
				chartData: {
					bookingsByDay: bookingsByPeriod,
					bookingLabels: dateLabels,
					customerTypes: {
						new: newCustomersThisPeriod.length,
						returning: returningCustomers
					},
					revenueByDay: revenueByPeriod,
					customersByDay: customersByPeriod,
					newCustomersByDay: newCustomersByPeriod,
					groupingStrategy: groupingStrategy
				}
			};
		})
});
