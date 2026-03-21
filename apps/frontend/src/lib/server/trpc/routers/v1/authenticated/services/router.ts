import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { prisma } from '$prisma';
import { TRPCError } from '@trpc/server';
import { convertToLocal, convertToUtc } from '$lib/utils';

export const router = createRouter({
	createService: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				name: z.string().min(3),
				employees: z.array(z.string()).optional(),
				duration: z.number(),
				price: z.number(),
				visible: z.boolean().optional(),
				sortingIndex: z.number().optional()
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				organizationId: z.string(),
				employees: z.array(z.string()).optional(),
				duration: z.number(),
				price: z.number()
			})
		)
		.mutation(
			async ({
				input: { organizationId, name, employees, duration, price, visible, sortingIndex }
			}) => {
				// get organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId
					},
					include: {
						members: true
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				const service = await prisma.service.create({
					data: {
						name,
						organizationId,
						duration,
						price,
						visible,
						sortingIndex: sortingIndex || 0
					}
				});
				if (employees) {
					for (let employee of employees) {
						if (!organization.members.find((member) => member.id === employee))
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'employee_not_found'
							});
						await prisma.employeeService.create({
							data: {
								serviceId: service.id,
								memberId: employee
							}
						});
					}
				}

				return service;
			}
		),

	getServices: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.output(
			z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					organizationId: z.string(),
					duration: z.number(),
					price: z.number(),
					sortingIndex: z.number(),
					employees: z.array(
						z.object({
							id: z.string(),
							name: z.string()
						})
					)
				})
			)
		)
		.query(async ({ input: { organizationId } }) => {
			const services = await prisma.service.findMany({
				where: {
					organizationId
				},
				include: {
					employees: {
						include: {
							member: {
								include: {
									user: true
								}
							}
						}
					}
				}
			});
			return services.map((service) => {
				return {
					...service,
					employees: service.employees.map((employee) => ({
						id: employee.member.id,
						name: employee.member.user.name
					}))
				};
			});
		}),

	updateService: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				serviceId: z.string(),
				name: z.string().min(3).optional(),
				employees: z.array(z.string()).optional(),
				duration: z.number().optional(),
				price: z.number().optional(),
				sortingIndex: z.number().optional(),
				visible: z.boolean().optional()
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				organizationId: z.string(),
				employees: z.array(z.string()).optional(),
				duration: z.number(),
				price: z.number(),
				sortingIndex: z.number()
			})
		)
		.mutation(
			async ({
				input: {
					organizationId,
					serviceId,
					name,
					employees,
					duration,
					price,
					visible,
					sortingIndex
				},
				ctx: {
					session: { user }
				}
			}) => {
				// get organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId
					},
					include: {
						members: true
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				if (!organization.members.find((member) => member.userId === user.id))
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_member_not_found'
					});

				const service = await prisma.service.findFirst({
					where: {
						id: serviceId
					}
				});
				if (!service)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'service_not_found'
					});
				await prisma.service.update({
					where: {
						id: serviceId
					},
					data: {
						name,
						duration,
						price,
						visible,
						sortingIndex: sortingIndex || 0
					}
				});
				if (employees) {
					await prisma.employeeService.deleteMany({
						where: {
							serviceId
						}
					});
					for (let employee of employees) {
						if (!organization.members.find((member) => member.id === employee))
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'employee_not_found'
							});
						await prisma.employeeService.create({
							data: {
								serviceId,
								memberId: employee
							}
						});
					}
				}

				return service;
			}
		),

	deleteService: privateProcedure
		.input(z.object({ serviceId: z.string(), organizationId: z.string() }))
		.output(z.boolean())
		.mutation(
			async ({
				input: { serviceId, organizationId },
				ctx: {
					session: { user }
				}
			}) => {
				// Check if user is a member of the organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId,
						members: {
							some: {
								userId: user.id
							}
						}
					},
					include: {
						members: {
							include: {
								user: true
							}
						}
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				const service = await prisma.service.findFirst({
					where: {
						id: serviceId
					}
				});
				if (!service)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'service_not_found'
					});
				await prisma.service.delete({
					where: {
						id: serviceId
					}
				});
				return true;
			}
		),

	createPackage: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				name: z.string().min(3),
				services: z.array(z.string()).optional(),
				price: z.number(),
				visible: z.boolean().optional(),
				sortingIndex: z.number().optional()
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				organizationId: z.string(),
				price: z.number(),
				sortingIndex: z.number()
			})
		)
		.mutation(
			async ({ input: { organizationId, name, services, price, visible, sortingIndex } }) => {
				// get organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId
					},
					include: {
						services: true
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				const packageItem = await prisma.package.create({
					data: {
						name,
						organizationId,
						price,
						visible,
						sortingIndex: sortingIndex || 0
					}
				});
				if (services) {
					for (let serviceId of services) {
						const serviceExists = organization.services.find((service) => service.id === serviceId);
						if (!serviceExists)
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'service_not_found'
							});
						await prisma.packageService.create({
							data: {
								packageId: packageItem.id,
								serviceId: serviceId
							}
						});
					}
				}

				return packageItem;
			}
		),

	getPackages: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.output(
			z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					organizationId: z.string(),
					price: z.number(),
					sortingIndex: z.number(),
					services: z.array(
						z.object({
							id: z.string(),
							name: z.string()
						})
					)
				})
			)
		)
		.query(async ({ input: { organizationId } }) => {
			const packages = await prisma.package.findMany({
				where: {
					organizationId
				},
				include: {
					services: {
						include: {
							service: true
						}
					}
				}
			});

			return packages.map((packageItem) => {
				return {
					...packageItem,
					services: packageItem.services.map((packageService) => ({
						id: packageService.service.id,
						name: packageService.service.name
					}))
				};
			});
		}),

	updatePackage: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				packageId: z.string(),
				name: z.string().min(3).optional(),
				services: z.array(z.string()).optional(),
				price: z.number().optional(),
				sortingIndex: z.number().optional(),
				visible: z.boolean().optional()
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				organizationId: z.string(),
				services: z.array(z.string()).optional(),
				price: z.number(),
				sortingIndex: z.number()
			})
		)
		.mutation(
			async ({
				input: { organizationId, packageId, name, services, price, visible, sortingIndex },
				ctx: {
					session: { user }
				}
			}) => {
				// get organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId
					},
					include: {
						members: true,
						services: true
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				if (!organization.members.find((member) => member.userId === user.id))
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_member_not_found'
					});

				const packageItem = await prisma.package.findFirst({
					where: {
						id: packageId
					}
				});
				if (!packageItem)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'package_not_found'
					});
				await prisma.package.update({
					where: {
						id: packageId
					},
					data: {
						name,
						price,
						visible,
						sortingIndex: sortingIndex || 0
					}
				});
				if (services) {
					await prisma.packageService.deleteMany({
						where: {
							packageId
						}
					});
					for (let serviceId of services) {
						const serviceExists = organization.services.find((service) => service.id === serviceId);
						if (!serviceExists)
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'service_not_found'
							});
						await prisma.packageService.create({
							data: {
								packageId,
								serviceId: serviceId
							}
						});
					}
				}

				return packageItem;
			}
		),

	deletePackage: privateProcedure
		.input(z.object({ packageId: z.string(), organizationId: z.string() }))
		.output(z.boolean())
		.mutation(
			async ({
				input: { packageId, organizationId },
				ctx: {
					session: { user }
				}
			}) => {
				// Check if user is a member of the organization
				const organization = await prisma.organization.findFirst({
					where: {
						id: organizationId,
						members: {
							some: {
								userId: user.id
							}
						}
					},
					include: {
						members: {
							include: {
								user: true
							}
						}
					}
				});
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				const packageItem = await prisma.package.findFirst({
					where: {
						id: packageId
					}
				});
				if (!packageItem)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'package_not_found'
					});
				await prisma.package.delete({
					where: {
						id: packageId
					}
				});
				return true;
			}
		)
});
