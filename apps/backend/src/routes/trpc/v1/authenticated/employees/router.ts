import { z } from 'zod';
import { router as createRouter, privateProcedure } from '@/middleware/trpc';
import { schema } from '@salora/database';
import { TRPCError } from '@trpc/server';
import { eq, and, inArray } from 'drizzle-orm';
import { convertToLocal, convertToUtc } from '@/lib/utils';
import { randomUUID } from 'node:crypto';

export const router = createRouter({
	createEmployee: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				name: z.string().min(3),
				email: z.string().email(),
				role: z.string().min(3),
				sendInvitation: z.boolean().optional().default(false)
			})
		)
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
				email: z.string(),
				role: z.string(),
				invitationStatus: z.string()
			})
		)
		.mutation(
			async ({ ctx: { db }, input: { organizationId, name, email, role, sendInvitation } }) => {
				// get organization
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
				if (organization.maxMembers && organization.members.length >= organization.maxMembers)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'max_members_reached'
					});
				if (organization.members.find((member) => member.user.email === email))
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'employee_already_exists'
					});
				// Upsert user: try to find, else insert
				let user = await db.query.user.findFirst({
					where: eq(schema.user.email, email)
				});
				if (!user) {
					const [inserted] = await db
						.insert(schema.user)
						.values({
							id: crypto.randomUUID(),
							name,
							email,
							emailVerified: false,
							createdAt: new Date(),
							updatedAt: new Date()
						})
						.returning();
					user = inserted;
				}
				const [member] = await db
					.insert(schema.member)
					.values({
						id: crypto.randomUUID(),
						createdAt: new Date(),
						userId: user.id,
						organizationId,
						role,
						invitationStatus: sendInvitation ? 'PENDING' : 'ACTIVE'
					})
					.returning();

				// Send invitation email if requested
				if (sendInvitation) {
					try {
						// await sendInvitationEmail(organization, user, role);
					} catch (error) {
						console.error('Failed to send invitation email:', error);
						// Don't fail the entire operation if email fails
					}
				}

				return {
					...user,
					...member,
					invitationStatus: member.invitationStatus
				};
			}
		),

	removeEmployee: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				employeeId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ ctx: { db }, input: { organizationId, employeeId } }) => {
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
			const member = await db.query.member.findFirst({
				where: and(
					eq(schema.member.id, employeeId),
					eq(schema.member.organizationId, organizationId)
				)
			});
			if (!member)
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'employee_not_found'
				});
			await db.delete(schema.member).where(eq(schema.member.id, employeeId));
			return true;
		}),

	updateEmployee: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				employeeId: z.string(),
				name: z.string().min(3),
				email: z.string().email(),
				role: z.string().min(3),
				availability: z
					.array(
						z.object({
							id: z.string().optional(),
							dayOfWeek: z.number().min(0).max(7),
							startTimeLocal: z.string(), // Format: "HH:mm"
							endTimeLocal: z.string() // Format: "HH:mm"
						})
					)
					.max(20),
				removeItems: z.array(z.string()).optional(),
				assignedServices: z.array(z.string()).optional()
			})
		)
		.output(
			z.object({
				id: z.string(),
				role: z.string(),
				invitationStatus: z.string(),
				services: z.array(z.string()),
				user: z.object({
					id: z.string(),
					email: z.string(),
					emailVerified: z.boolean(),
					name: z.string(),
					createdAt: z.date(),
					updatedAt: z.date(),
					image: z.string().nullable(),
					phone: z.string().nullable()
				}),
				availability: z.array(
					z.object({
						id: z.string(),
						dayOfWeek: z.number(),
						startTimeLocal: z.string(),
						endTimeLocal: z.string()
					})
				)
			})
		)
		.mutation(
			async ({
				ctx: { db },
				input: {
					organizationId,
					employeeId,
					name,
					email,
					role,
					availability,
					removeItems,
					assignedServices
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
				const member = organization.members.find((member) => member.id === employeeId);
				if (!member)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'employee_not_found'
					});
				await db.update(schema.member).set({ role }).where(eq(schema.member.id, employeeId));
				//assign services to the employee
				if (assignedServices) {
					// Remove all services
					await db
						.delete(schema.employeeService)
						.where(eq(schema.employeeService.memberId, employeeId));
					// Add the new services
					for (let service of assignedServices) {
						const serviceExists = await db.query.service.findFirst({
							where: eq(schema.service.id, service)
						});
						if (serviceExists) {
							const employeeService = await db.query.employeeService.findFirst({
								where: and(
									eq(schema.employeeService.serviceId, service),
									eq(schema.employeeService.memberId, employeeId)
								)
							});
							if (!employeeService) {
								await db.insert(schema.employeeService).values({
									id: crypto.randomUUID(),
									serviceId: service,
									memberId: employeeId
								});
							}
						}
					}
				}
				// update the availability
				const updatedTimes = availability.map((time) => ({
					id: time.id,
					dayOfWeek: time.dayOfWeek,
					startTimeUtc: convertToUtc(time.startTimeLocal, time.dayOfWeek, organization.timeZone),
					endTimeUtc: convertToUtc(time.endTimeLocal, time.dayOfWeek, organization.timeZone)
				}));
				//check for each if the start time is before the end time
				for (let time of updatedTimes) {
					if (time.startTimeUtc > time.endTimeUtc)
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: 'start_time_must_be_before_end_time'
						});
				}
				// Bereid alle queries voor in een array
				const batchQueries = [];

				// 1. Update de rol van de medewerker
				batchQueries.push(
					db.update(schema.member).set({ role }).where(eq(schema.member.id, employeeId))
				);

				// 2. Update de gekoppelde user
				batchQueries.push(
					db.update(schema.user).set({ name, email }).where(eq(schema.user.id, member.userId))
				);

				// 3. Update de availability
				for (let time of updatedTimes) {
					if (time.startTimeUtc > time.endTimeUtc) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: 'start_time_must_be_before_end_time'
						});
					}
				}

				// 4. Verwijder oude availability
				if (removeItems && removeItems.length > 0) {
					batchQueries.push(
						db.delete(schema.availability).where(inArray(schema.availability.id, removeItems))
					);
				}

				// 5. Upsert nieuwe availability
				for (const time of updatedTimes) {
					if (time.id) {
						batchQueries.push(
							db
								.update(schema.availability)
								.set({
									dayOfWeek: time.dayOfWeek,
									startTimeUtc: time.startTimeUtc,
									endTimeUtc: time.endTimeUtc
								})
								.where(eq(schema.availability.id, time.id))
						);
					} else {
						batchQueries.push(
							db.insert(schema.availability).values({
								id: crypto.randomUUID(),
								dayOfWeek: time.dayOfWeek,
								startTimeUtc: time.startTimeUtc,
								endTimeUtc: time.endTimeUtc,
								memberId: employeeId
							})
						);
					}
				}

				// Voer alle queries als één D1 transactie uit
				await db.batch(batchQueries as [any, ...any[]]);

				// also update the user
				const [user] = await db
					.update(schema.user)
					.set({ name, email })
					.where(eq(schema.user.id, member.userId))
					.returning();
				const fetchedMember = await db.query.member.findFirst({
					where: eq(schema.member.id, employeeId),
					with: {
						employeeServices: {
							with: {
								service: true
							}
						},
						timeOffs: true,
						availabilities: true,
						user: true
					}
				});
				if (!fetchedMember)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'employee_not_found'
					});
				return {
					...user,
					...fetchedMember,
					services: fetchedMember.employeeServices.map((es) => es.serviceId),
					availability: fetchedMember.availabilities.map((time) => ({
						...time,
						startTimeLocal: convertToLocal(time.startTimeUtc, organization.timeZone),
						endTimeLocal: convertToLocal(time.endTimeUtc, organization.timeZone)
					}))
				};
			}
		),

	updateInvitationStatus: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				employeeId: z.string(),
				status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'ACTIVE'])
			})
		)
		.output(z.boolean())
		.mutation(async ({ ctx: { db }, input: { organizationId, employeeId, status } }) => {
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

			if (!organization) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'organization_not_found'
				});
			}

			const member = organization.members.find((m) => m.id === employeeId);
			if (!member) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'employee_not_found'
				});
			}

			await db
				.update(schema.member)
				.set({ invitationStatus: status })
				.where(eq(schema.member.id, employeeId));

			return true;
		}),

	resendInvitation: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				employeeId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ ctx: { db }, input: { organizationId, employeeId } }) => {
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

			if (!organization) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'organization_not_found'
				});
			}

			const member = organization.members.find((m) => m.id === employeeId);
			if (!member) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'employee_not_found'
				});
			}

			// Update status to pending
			await db
				.update(schema.member)
				.set({ invitationStatus: 'PENDING' })
				.where(eq(schema.member.id, employeeId));

			// Send invitation email
			try {
				// await sendInvitationEmail(organization, member.user, member.role);
			} catch (error) {
				console.error('Failed to resend invitation email:', error);
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'failed_to_send_email'
				});
			}

			return true;
		})
});
