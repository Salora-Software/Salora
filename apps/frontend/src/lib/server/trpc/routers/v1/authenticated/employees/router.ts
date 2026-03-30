import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { prisma } from '$lib/server/prisma';
import { TRPCError } from '@trpc/server';
import { convertToLocal, convertToUtc } from '$lib/utils';
import { env } from '$env/dynamic/private';

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
		.mutation(async ({ input: { organizationId, name, email, role, sendInvitation } }) => {
			// get organization
			const organization = await prisma.organization.findFirst({
				where: {
					id: organizationId
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
			const user = await prisma.user.upsert({
				where: {
					email
				},
				update: {},
				create: {
					id: crypto.randomUUID(),
					name,
					email,
					emailVerified: false,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			});
			const member = await prisma.member.create({
				data: {
					id: crypto.randomUUID(),
					createdAt: new Date(),
					userId: user.id,
					organizationId,
					role,
					invitationStatus: sendInvitation ? 'PENDING' : 'ACTIVE'
				}
			});

			// Send invitation email if requested
			if (sendInvitation) {
				try {
					await sendInvitationEmail(organization, user, role);
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
		}),

	removeEmployee: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				employeeId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { organizationId, employeeId } }) => {
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
			const member = await prisma.member.findFirst({
				where: {
					id: employeeId,
					organizationId
				}
			});
			if (!member)
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'employee_not_found'
				});
			await prisma.member.delete({
				where: {
					id: employeeId
				}
			});
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
				const member = organization.members.find((member) => member.id === employeeId);
				if (!member)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'employee_not_found'
					});
				await prisma.member.update({
					where: {
						id: employeeId
					},
					data: {
						role
					}
				});
				//assign services to the employee
				if (assignedServices) {
					//remove all services
					await prisma.employeeService.deleteMany({
						where: {
							memberId: employeeId
						}
					});
					//add the new services
					for (let service of assignedServices) {
						const serviceExists = await prisma.service.findFirst({
							where: {
								id: service
							}
						});
						if (serviceExists) {
							const employeeService = await prisma.employeeService.findFirst({
								where: {
									serviceId: service,
									memberId: employeeId
								}
							});
							if (!employeeService) {
								await prisma.employeeService.create({
									data: {
										serviceId: service,
										memberId: employeeId
									}
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
				await prisma.$transaction(async (tx) => {
					// Delete outdated availability (only if removeItems has values)
					if (removeItems && removeItems.length > 0) {
						await tx.availability.deleteMany({
							where: { id: { in: removeItems } }
						});
					}

					// Handle availability updates/creates separately
					for (const time of updatedTimes) {
						if (time.id) {
							// Update existing availability
							await tx.availability.update({
								where: { id: time.id },
								data: {
									dayOfWeek: time.dayOfWeek,
									startTimeUtc: time.startTimeUtc,
									endTimeUtc: time.endTimeUtc
								}
							});
						} else {
							// Create new availability
							await tx.availability.create({
								data: {
									id: crypto.randomUUID(),
									dayOfWeek: time.dayOfWeek,
									startTimeUtc: time.startTimeUtc,
									endTimeUtc: time.endTimeUtc,
									memberId: employeeId
								}
							});
						}
					}
				});

				// also update the user
				const user = await prisma.user.update({
					where: {
						id: member.userId
					},
					data: {
						name,
						email
					}
				});
				const fetchedMember = await prisma.member.findFirst({
					where: {
						id: employeeId
					},
					include: {
						services: true,
						timeOffs: true,
						availability: true,
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
					services: fetchedMember.services.map((service) => service.serviceId),
					availability: fetchedMember.availability.map((time) => ({
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
		.mutation(async ({ input: { organizationId, employeeId, status } }) => {
			const organization = await prisma.organization.findFirst({
				where: { id: organizationId },
				include: { members: { include: { user: true } } }
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

			await prisma.member.update({
				where: { id: employeeId },
				data: { invitationStatus: status }
			});

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
		.mutation(async ({ input: { organizationId, employeeId } }) => {
			const organization = await prisma.organization.findFirst({
				where: { id: organizationId },
				include: { members: { include: { user: true } } }
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
			await prisma.member.update({
				where: { id: employeeId },
				data: { invitationStatus: 'PENDING' }
			});

			// Send invitation email
			try {
				await sendInvitationEmail(organization, member.user, member.role);
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

// Helper function to send invitation emails
async function sendInvitationEmail(organization: any, user: any, role: string) {
	const emailWorkerUrl = env?.EMAIL_WORKER_URL || 'http://localhost:3001';

	const emailHtml = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Uitnodiging voor ${organization.name}</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
				<h1 style="color: white; margin: 0; font-size: 28px;">🎉 Je bent uitgenodigd!</h1>
			</div>
			
			<div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
				<h2 style="color: #333; margin-top: 0;">Hallo ${user.name},</h2>
				<p style="font-size: 16px; margin-bottom: 20px;">
					Je bent uitgenodigd om lid te worden van <strong>${organization.name}</strong> als <strong>${role}</strong>.
				</p>
				
				<div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea;">
					<h3 style="margin-top: 0; color: #667eea;">📋 Details van je uitnodiging:</h3>
					<ul style="padding-left: 20px;">
						<li><strong>Organisatie:</strong> ${organization.name}</li>
						<li><strong>Rol:</strong> ${role}</li>
						<li><strong>E-mail:</strong> ${user.email}</li>
					</ul>
				</div>
			</div>
			
			<div style="text-align: center; margin: 30px 0;">
				<a href="${env?.PUBLIC_FRONTEND_URL || 'http://localhost:5173'}/app" 
				   style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
					✨ Accepteer uitnodiging
				</a>
			</div>
			
			<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
				<p style="margin: 0; font-size: 14px;">
					<strong>💡 Wat nu?</strong><br>
					Klik op de knop hierboven om in te loggen en je uitnodiging te accepteren. 
					Je kunt dan direct aan de slag!
				</p>
			</div>
			
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			
			<div style="text-align: center; color: #666; font-size: 14px;">
				<p>Deze uitnodiging is verstuurd door ${organization.name}</p>
				<p style="margin: 5px 0;">Heb je deze uitnodiging niet verwacht? Je kunt deze e-mail negeren.</p>
			</div>
		</body>
		</html>
	`;

	const emailData = {
		to: user.email,
		subject: `Uitnodiging voor ${organization.name}`,
		html: emailHtml,
		from: `${organization.name} <noreply@${organization.email?.split('@')[1] || 'lumabooking.com'}>`
	};

	const response = await fetch(`${emailWorkerUrl}/send-email`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(emailData)
	});

	if (!response.ok) {
		throw new Error(`Failed to send email: ${response.statusText}`);
	}

	return response.json();
}
