import { z } from 'zod';
import { router as createRouter, privateProcedure, publicProcedure } from '../../../../context';
import { TRPCError } from '@trpc/server';
import { auth } from '$lib/server/auth';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	MAIL_FALLBACK_PASSWORD,
	MAIL_FALLBACK_PORT,
	MAIL_FALLBACK_SERVER,
	MAIL_FALLBACK_USERNAME
} from '$env/static/private';
import { replaceVariables } from '$lib/templateReplacer';
import { Emailer } from '@salora/mailer';
import redis from '$lib/server/redis';

export const router = createRouter({
	getTemplates: privateProcedure.query(async ({ ctx, input }) => {
		   const templates = await db.select().from(schema.template).where(eq(schema.template.organizationId, input.organizationId));
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
			   const updated = await db.update(schema.template)
				   .set({ enabled: input.enabled })
				   .where(and(
					   eq(schema.template.type, input.type),
					   eq(schema.template.target, input.target),
					   eq(schema.template.organizationId, ctx.session.session.activeOrganizationId!)
				   ));
			   if (updated.rowCount === 0)
				   throw new TRPCError({
					   code: 'NOT_FOUND',
					   message: 'template_not_found'
				   });
			   return updated;
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
			   // Upsert template by (type, target, organizationId)
			   const orgId = ctx.session.session.activeOrganizationId!;
			   const upserted = await db.insert(schema.template)
				   .values({
					   type: input.type,
					   target: input.target,
					   organizationId: orgId,
					   subject: input.subject,
					   body: input.body,
					   enabled: true,
					   updatedAt: new Date().toISOString(),
				   })
				   .onConflictDoUpdate({
					   target: [schema.template.type, schema.template.target, schema.template.organizationId],
					   set: {
						   subject: input.subject,
						   body: input.body,
						   updatedAt: new Date().toISOString(),
					   },
				   });
			   return upserted;
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
			   // Drizzle: get organization and members (no include, need two queries)
			   let branch = await db.query.organization.findFirst({
				   where: eq(schema.organization.id, organizationId!)
			   });
			   // TODO: If members are needed, fetch separately (not used in this code)
			if (!branch) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}
			   const communication = await db.query.communicationSetting.findFirst({
				   where: and(
					   eq(schema.communicationSetting.organizationId, organizationId!),
					   eq(schema.communicationSetting.type, 'EMAIL')
				   )
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
					smtp_host: MAIL_FALLBACK_SERVER,
					smtp_port: parseInt(MAIL_FALLBACK_PORT, 10),
					username: MAIL_FALLBACK_USERNAME,
					password: MAIL_FALLBACK_PASSWORD
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
			const organizationId = ctx.session.session.activeOrganizationId!;
			const communications = await db
				.select()
				.from(schema.communicationSetting)
				.where(eq(schema.communicationSetting.organizationId, organizationId));

			return communications.map((communication) => {
				const settings = communication.settings || {};
				return {
					enabled: communication.enabled,
					type: communication.type,
					smtpServer: settings.smtpServer,
					smtpPort: settings.smtpPort,
					smtpUsername: settings.smtpUsername,
					smtpPassword: settings.smtpPassword,
					smsProvider: settings.smsProvider,
					smsApiKey: settings.smsApiKey,
					smtpEmail: settings.smtpEmail
				};
			});
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
			   // Drizzle transaction for bulk upsert
			   const orgId2 = ctx.session.session.activeOrganizationId!;
			   const results = await db.transaction(async (trx) => {
				   const upserts = await Promise.all(
					   input.communications.map(async (communication) => {
						   const { type, enabled, ...rest } = communication;
						   return trx.insert(schema.communicationSetting)
							   .values({
								   type,
								   organizationId: orgId2,
								   enabled,
								   settings: rest,
								   updatedAt: new Date().toISOString(),
							   })
							   .onConflictDoUpdate({
								   target: [schema.communicationSetting.type, schema.communicationSetting.organizationId],
								   set: {
									   enabled,
									   settings: rest,
									   updatedAt: new Date().toISOString(),
								   },
							   });
					   })
				   );
				   return upserts;
			   });
			   return results;
		})
});
