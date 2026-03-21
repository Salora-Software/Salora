import { z } from 'zod';
import { router as createRouter, privateProcedure, publicProcedure } from '../../../../context';
import { TRPCError } from '@trpc/server';
import { auth } from '$lib/server/auth';
import { getCommunications, prisma } from '$prisma';
import { env } from '$lib/server/env';
import { replaceVariables } from '$lib/templateReplacer';
import { Emailer } from '@salora/mailer';
import redis from '$lib/server/redis';

export const router = createRouter({
	getTemplates: privateProcedure.query(async ({ ctx, input }) => {
		const templates = await prisma.template.findMany({
			where: {
				organizationId: input.organizationId
			}
		});
		return templates;
	}),
	updateTemplateStatus: privateProcedure
		.input(
			z.object({
				type: z.string(),
				target: z.string(),
				enabled: z.boolean()
			})
		)
		.output(z.any())
		.mutation(async ({ ctx, input }) => {
			const template = await prisma.template.updateMany({
				where: {
					//@ts-ignore
					type: input.type,
					//@ts-ignore
					target: input.target,
					organizationId: ctx.session.session.activeOrganizationId!
				},
				data: {
					enabled: input.enabled
				}
			});
			if (template.count === 0)
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'template_not_found'
				});

			return template;
		}),
	upsertTemplate: privateProcedure
		.input(
			z.object({
				type: z.string(),
				subject: z.string(),
				body: z.string(),
				target: z.string()
			})
		)
		.output(z.any())
		.mutation(async ({ ctx, input }) => {
			const template = await prisma.template.upsert({
				where: {
					type_target_organizationId: {
						//@ts-ignore
						type: input.type,
						organizationId: ctx.session.session.activeOrganizationId!,
						//@ts-ignore
						target: input.target
					}
				},
				create: {
					//@ts-ignore
					type: input.type,
					organizationId: ctx.session.session.activeOrganizationId!,
					subject: input.subject,
					body: input.body,
					//@ts-ignore
					target: input.target
				},
				update: {
					subject: input.subject,
					body: input.body
				}
			});
			return template;
		}),
	sendTestEmail: privateProcedure
		.input(
			z.object({
				subject: z.string(),
				body: z.string(),
				email: z.string().email()
			})
		)
		.output(z.any())
		.mutation(async ({ ctx, input }) => {
			const organizationId = ctx.session.session.activeOrganizationId;
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
			const communication = await prisma.communicationSetting.findFirst({
				where: {
					organizationId: organizationId!,
					type: 'EMAIL'
				}
			});
			console.log('communication', communication, organizationId);
			// if (!communication)
			// 	throw new TRPCError({
			// 		code: 'NOT_FOUND',
			// 		message: 'communication_not_found'
			// 	});

			//send emailconst communications = await getCommunications(ctx.session.session.activeOrganizationId!);

			const formattedEmailCommunication = {
				provider_name: communication?.type as string,
				priority: 10,
				//@ts-ignore
				smtp_host: communication?.settings?.smtpServer,
				//@ts-ignore
				smtp_port: communication?.settings?.smtpPort,
				//@ts-ignore
				username: communication?.settings?.smtpUsername,
				//@ts-ignore
				password: communication?.settings?.smtpPassword
			};
			const emailer = new Emailer(redis, [
				{
					provider_name: 'EMAIL FALLBACK',
					priority: 100,
					smtp_host: env?.MAIL_FALLBACK_SERVER,
					smtp_port: env?.MAIL_FALLBACK_PORT,
					username: env?.MAIL_FALLBACK_USERNAME,
					password: env?.MAIL_FALLBACK_PASSWORD
				},
				formattedEmailCommunication
			]);
			emailer.sendEmail(
				'',
				(communication?.settings as { smtpEmail?: string })?.smtpEmail ||
					formattedEmailCommunication.username,
				input.email,
				input.subject,
				replaceVariables(input.body, {
					branch,
					date: {
						now: new Date().toLocaleString('nl-NL', { timeZone: branch.timeZone }),
						year: new Date().getFullYear(),
						month: new Date().getMonth(),
						day: new Date().getDate()
					},
					customer: {
						name: 'John Doe',
						firstName: 'John',
						lastName: 'Doe',
						email: 'johndoe@example.com',
						phone: '0612345678'
					},
					booking: {
						name: 'Knippen',
						price: '€ 20,00',
						date: new Date().toLocaleString('nl-NL', { timeZone: branch.timeZone })
					}
				})
			);
			return true;
		}),
	getCommunications: privateProcedure
		.input(z.object({}))
		.output(
			z.array(
				z
					.object({
						enabled: z.boolean(),
						type: z.string(),
						smtpServer: z.string().optional(),
						smtpPort: z.number().optional(),
						smtpUsername: z.string().optional(),
						smtpPassword: z.string().optional(),
						smsProvider: z.string().optional(),
						smsApiKey: z.string().optional(),
						smtpEmail: z.string().optional()
					})
					.refine((data) => {
						if (data.type === 'email') {
							return (
								data.smtpServer?.trim() &&
								(data.smtpPort === undefined || data.smtpPort) &&
								data.smtpUsername?.trim() &&
								data.smtpPassword?.trim()
							);
						}
						if (data.type === 'sms') {
							return data.smsProvider && data.smsApiKey;
						}
						return true;
					})
			)
		)
		//@ts-ignore
		.query(async ({ ctx }) => {
			return await getCommunications(ctx.session.session.activeOrganizationId!);
		}),
	saveCommunications: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				communications: z.array(
					z
						.object({
							enabled: z.boolean(),
							type: z.string(),
							smtpServer: z.string().optional(),
							smtpPort: z
								.number()
								.optional()
								.refine((port) => !port || (port > 0 && port <= 65535), {
									message: 'invalid_port'
								}),
							smtpUsername: z.string().optional(),
							smtpPassword: z.string().optional(),
							smsProvider: z.string().optional(),
							smsApiKey: z.string().optional(),
							smtpEmail: z.string().optional()
						})
						.refine(
							(data) => {
								if (data.type === 'email') {
									return (
										data.smtpServer?.trim() &&
										(data.smtpPort === undefined || data.smtpPort) &&
										data.smtpUsername?.trim() &&
										data.smtpPassword?.trim()
									);
								}
								if (data.type === 'sms') {
									return data.smsProvider && data.smsApiKey;
								}
								return true;
							},
							{
								message: 'missing_fields'
							}
						)
				)
			})
		)
		.output(z.any())
		.mutation(async ({ input, ctx }) => {
			//use upsert and also use transactional so if 1 fails, all fail
			let communications = await prisma.$transaction(
				input.communications.map((communication) =>
					(() => {
						const { type, enabled, ...rest } = communication;
						return prisma.communicationSetting.upsert({
							where: {
								type_organizationId: {
									//@ts-ignore
									type: type,
									organizationId: input.organizationId
								}
							},
							create: {
								//@ts-ignore
								type: type,
								organizationId: ctx.session.session.activeOrganizationId!,
								enabled,
								settings: {
									...rest
								}
							},
							update: {
								//@ts-ignore
								type: type,
								organizationId: ctx.session.session.activeOrganizationId!,
								enabled,
								settings: {
									...rest
								}
							}
						});
					})()
				)
			);
			return communications;
		})
});
