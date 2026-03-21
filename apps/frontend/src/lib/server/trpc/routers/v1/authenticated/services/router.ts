import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { db, schema } from '$lib/server/db';
import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { convertToLocal, convertToUtc } from '$lib/utils';
import { randomUUID } from 'node:crypto';

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
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
						members: true
					}
				});

				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});

				const [service] = await db
					.insert(schema.service)
					.values({
						id: randomUUID(),
						name,
						organizationId,
						duration,
						price,
						visible,
						sortingIndex: sortingIndex || 0
					})
					.returning();

				if (employees) {
					for (let employee of employees) {
						if (!organization.members.find((member) => member.id === employee))
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'employee_not_found'
							});
						await db.insert(schema.employeeService).values({
							id: randomUUID(), // employeeService needs ID too?
							serviceId: service.id,
							memberId: employee
						});
					}
				}

				return { ...service, employees: employees || [] };
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
			const services = await db.query.service.findMany({
				where: eq(schema.service.organizationId, organizationId),
				with: {
					employeeServices: {
						with: {
							member: {
								with: {
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
					employees: service.employeeServices.map((es) => ({
						id: es.member.id,
						name: es.member.user.name
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
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
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

				const service = await db.query.service.findFirst({
					where: eq(schema.service.id, serviceId)
				});

				if (!service)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'service_not_found'
					});

				const updateData: any = {};
				if (name !== undefined) updateData.name = name;
				if (duration !== undefined) updateData.duration = duration;
				if (price !== undefined) updateData.price = price;
				if (visible !== undefined) updateData.visible = visible;
				if (sortingIndex !== undefined) updateData.sortingIndex = sortingIndex;

				const [updatedService] = await db
					.update(schema.service)
					.set(updateData)
					.where(eq(schema.service.id, serviceId))
					.returning();

				if (employees) {
					await db
						.delete(schema.employeeService)
						.where(eq(schema.employeeService.serviceId, serviceId));

					for (let employee of employees) {
						if (!organization.members.find((member) => member.id === employee))
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'employee_not_found'
							});
						await db.insert(schema.employeeService).values({
							id: randomUUID(),
							serviceId: serviceId,
							memberId: employee
						});
					}
				}

				return { ...updatedService, employees: employees };
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
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
						members: {
							with: {
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
					
				const isMember = organization.members.some(m => m.userId === user.id);
				if (!isMember) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				}

				const service = await db.query.service.findFirst({
					where: eq(schema.service.id, serviceId)
				});

				if (!service)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'service_not_found'
					});

				await db.delete(schema.service).where(eq(schema.service.id, serviceId));
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
				services: z.array(z.string()).optional(),
				price: z.number(),
				sortingIndex: z.number()
			})
		)
		.mutation(
			async ({ input: { organizationId, name, services, price, visible, sortingIndex } }) => {
				// get organization
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
						services: true
					}
				});

				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});

				const [packageItem] = await db
					.insert(schema.packageItem)
					.values({
						id: randomUUID(),
						name,
						organizationId,
						price,
						visible,
						sortingIndex: sortingIndex || 0,
						updatedAt: new Date().toISOString(),
						createdAt: new Date().toISOString() // Safely add createdAt too if missing default logic
					})
					.returning();

				if (services) {
					for (let serviceId of services) {
						const serviceExists = organization.services.find((service) => service.id === serviceId);
						if (!serviceExists)
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'service_not_found'
							});
						await db.insert(schema.packageService).values({
							id: randomUUID(),
							packageId: packageItem.id,
							serviceId: serviceId
						});
					}
				}

				return { ...packageItem, services };
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
			const packages = await db.query.packageItem.findMany({
				where: eq(schema.packageItem.organizationId, organizationId),
				with: {
					packageServices: {
						with: {
							service: true
						}
					}
				}
			});

			return packages.map((packageItem) => {
				return {
					...packageItem,
					services: packageItem.packageServices.map((ps) => ({
						id: ps.service.id,
						name: ps.service.name
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
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
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

				const packageItem = await db.query.packageItem.findFirst({
					where: eq(schema.packageItem.id, packageId)
				});

				if (!packageItem)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'package_not_found'
					});

				const updateData: any = {};
				if (name !== undefined) updateData.name = name;
				if (price !== undefined) updateData.price = price;
				if (visible !== undefined) updateData.visible = visible;
				if (sortingIndex !== undefined) updateData.sortingIndex = sortingIndex;

				const [updatedPackage] = await db
					.update(schema.packageItem)
					.set({
						...updateData,
						updatedAt: new Date().toISOString()
					})
					.where(eq(schema.packageItem.id, packageId))
					.returning();

				if (services) {
					await db
						.delete(schema.packageService)
						.where(eq(schema.packageService.packageId, packageId));

					for (let serviceId of services) {
						const serviceExists = organization.services.find((service) => service.id === serviceId);
						if (!serviceExists)
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'service_not_found'
							});
						await db.insert(schema.packageService).values({
							id: randomUUID(),
							packageId,
							serviceId: serviceId
						});
					}
				}

				return { ...updatedPackage, services };
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
				const organization = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
					with: {
						members: {
							with: {
								user: true // Check userId logic
							}
						}
					}
				});
				
				if (!organization)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				
				const isMember = organization.members.some(m => m.userId === user.id);
				if (!isMember) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				}

				const packageItem = await db.query.packageItem.findFirst({
					where: eq(schema.packageItem.id, packageId)
				});

				if (!packageItem)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'package_not_found'
					});

				await db.delete(schema.packageItem).where(eq(schema.packageItem.id, packageId));
				return true;
			}
		)
});
