import { TRPCError } from '@trpc/server';
import { prisma } from '$lib/server/prisma';
import { DateTime } from 'luxon';
import type { GetDashboardStatsInput } from './get-dashboard-stats.schema';

export const getDashboardStatsHandler = async ({
	input,
	ctx: { session }
}: {
	input: GetDashboardStatsInput;
	ctx: any;
}) => {
	const organizationId = input.organizationId || session.session.activeOrganizationId;
	const branch = await prisma.organization.findFirst({
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

	const now = DateTime.now().setZone(branch.timeZone);

	let startOfPeriod: DateTime;
	let endOfPeriod: DateTime;
	let startOfLastPeriod: DateTime;
	let endOfLastPeriod: DateTime;

	if (input.startDate && input.endDate) {
		startOfPeriod = DateTime.fromISO(input.startDate).setZone(branch.timeZone).startOf('day');
		endOfPeriod = DateTime.fromISO(input.endDate).setZone(branch.timeZone).endOf('day');

		const periodLength = endOfPeriod.diff(startOfPeriod, 'days').days;
		endOfLastPeriod = startOfPeriod.minus({ days: 1 }).endOf('day');
		startOfLastPeriod = endOfLastPeriod.minus({ days: periodLength }).startOf('day');
	} else {
		startOfPeriod = now.startOf('month');
		endOfPeriod = now.endOf('month');
		startOfLastPeriod = startOfPeriod.minus({ months: 1 });
		endOfLastPeriod = endOfPeriod.minus({ months: 1 });
	}

	const startOfPeriodUTC = startOfPeriod.toJSDate();
	const endOfPeriodUTC = endOfPeriod.toJSDate();
	const startOfLastPeriodUTC = startOfLastPeriod.toJSDate();
	const endOfLastPeriodUTC = endOfLastPeriod.toJSDate();

	const [
		currentPeriodBookings,
		lastPeriodBookings,
		newCustomersThisPeriod,
		newCustomersLastPeriod,
		returningCustomers
	] = await Promise.all([
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
		prisma.customer.count({
			where: {
				organizationId: organizationId!,
				createdAt: {
					gte: startOfLastPeriodUTC,
					lte: endOfLastPeriodUTC
				}
			}
		}),
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

	const uniqueCustomerIds = new Set(currentPeriodBookings.map((booking) => booking.customerId));
	const totalCustomersThisPeriod = uniqueCustomerIds.size;

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

	const currentPeriodRevenue = currentPeriodBookings
		.filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
		.reduce((sum, booking) => sum + booking.service.price, 0);
	const lastPeriodRevenue = lastPeriodBookings
		.filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
		.reduce((sum, booking) => sum + booking.service.price, 0);

	const appointmentChange =
		lastPeriodBookings.length > 0
			? ((currentPeriodBookings.length - lastPeriodBookings.length) / lastPeriodBookings.length) * 100
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
			? ((newCustomersThisPeriod.length - newCustomersLastPeriod) / newCustomersLastPeriod) * 100
			: 100;

	const totalDays = Math.ceil(endOfPeriod.diff(startOfPeriod, 'days').days) + 1;
	let groupingStrategy: 'daily' | 'weekly' | 'monthly' | 'yearly';
	let periodCount: number;

	if (totalDays <= 21) {
		groupingStrategy = 'daily';
		periodCount = totalDays;
	} else if (totalDays <= 365) {
		groupingStrategy = 'weekly';
		const weekStart = startOfPeriod.startOf('week');
		const weekEnd = endOfPeriod.endOf('week');
		periodCount = Math.ceil(weekEnd.diff(weekStart, 'weeks').weeks);
	} else if (totalDays <= 1825) {
		groupingStrategy = 'monthly';
		const monthStart = startOfPeriod.startOf('month');
		const monthEnd = endOfPeriod.endOf('month');
		periodCount = Math.ceil(monthEnd.diff(monthStart, 'months').months);
	} else {
		groupingStrategy = 'yearly';
		const yearStart = startOfPeriod.startOf('year');
		const yearEnd = endOfPeriod.endOf('year');
		periodCount = Math.ceil(yearEnd.diff(yearStart, 'years').years);
	}

	const bookingsByPeriod = new Array(periodCount).fill(0);
	const revenueByPeriod = new Array(periodCount).fill(0);
	const customersByPeriod = new Array(periodCount).fill(0);
	const newCustomersByPeriod = new Array(periodCount).fill(0);
	const periodDates = new Array<Date>(periodCount);
	const periodCustomers = new Array(periodCount).fill(null).map(() => new Set<string>());

	const getPeriodIndex = (date: DateTime): number => {
		switch (groupingStrategy) {
			case 'daily':
				return Math.floor(date.diff(startOfPeriod, 'days').days);
			case 'weekly': {
				const weekStart = startOfPeriod.startOf('week');
				return Math.floor(date.startOf('week').diff(weekStart, 'weeks').weeks);
			}
			case 'monthly': {
				const monthStart = startOfPeriod.startOf('month');
				return Math.floor(date.startOf('month').diff(monthStart, 'months').months);
			}
			case 'yearly': {
				const yearStart = startOfPeriod.startOf('year');
				return Math.floor(date.startOf('year').diff(yearStart, 'years').years);
			}
			default:
				return 0;
		}
	};

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

	for (const booking of currentPeriodBookings) {
		const bookingDate = DateTime.fromJSDate(booking.createdAt).setZone(branch.timeZone);
		const periodIndex = getPeriodIndex(bookingDate);

		if (periodIndex >= 0 && periodIndex < periodCount) {
			bookingsByPeriod[periodIndex]++;
			if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
				revenueByPeriod[periodIndex] += booking.service.price;
			}
			if (booking.customerId) {
				periodCustomers[periodIndex].add(booking.customerId);
			}
		}
	}

	for (const customer of newCustomersThisPeriod) {
		const customerDate = DateTime.fromJSDate(customer.createdAt).setZone(branch.timeZone);
		const periodIndex = getPeriodIndex(customerDate);

		if (periodIndex >= 0 && periodIndex < periodCount) {
			newCustomersByPeriod[periodIndex]++;
		}
	}

	for (let i = 0; i < periodCount; i++) {
		const periodStart = getPeriodStartDate(i);
		periodDates[i] = periodStart.toUTC().toJSDate();
		customersByPeriod[i] = periodCustomers[i].size;
	}

	const points = periodDates.map((date, i) => ({
		date,
		bookings: bookingsByPeriod[i] || 0,
		revenue: revenueByPeriod[i] || 0,
		customers: customersByPeriod[i] || 0,
		newCustomers: newCustomersByPeriod[i] || 0
	}));

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
			points,
			customerTypes: {
				new: newCustomersThisPeriod.length,
				returning: returningCustomers
			},
			groupingStrategy
		}
	};
};
