import { z } from 'zod';
import { router as createRouter, privateProcedure, publicProcedure } from '../../../../context';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import type { EmailQueueMessage } from '@salora/mailer';

export const router = createRouter({
	getTemplates: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.query(async ({ ctx: { db }, input }) => {
			const templates = await db
				.select()
				.from(schema.template)
				.where(eq(schema.template.organizationId, input.organizationId));
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
		.mutation(async ({ ctx: { db, session }, input }) => {
			const updated = await db
				.update(schema.template)
				.set({ enabled: input.enabled })
				.where(
					and(
						eq(schema.template.type, input.type),
						eq(schema.template.target, input.target),
						eq(schema.template.organizationId, session.session.activeOrganizationId!)
					)
				)
				.returning();

			if (updated.length === 0)
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
		.mutation(async ({ ctx: { db, session }, input }) => {
			// Upsert template by (type, target, organizationId)
			const orgId = session.session.activeOrganizationId!;
			const upserted = await db
				.insert(schema.template)
				.values({
					id: crypto.randomUUID(),
					type: input.type,
					target: input.target,
					organizationId: orgId,
					subject: input.subject,
					body: input.body,
					enabled: true,
					updatedAt: new Date()
				})
				.onConflictDoUpdate({
					target: [schema.template.type, schema.template.target, schema.template.organizationId],
					set: {
						subject: input.subject,
						body: input.body,
						updatedAt: new Date()
					}
				});
			return upserted;
		}),
	sendTestEmail: privateProcedure
		.input(
			z.object({
				templateType: z.string(),
				email: z.string().email()
			})
		)
		.output(z.any())
		.mutation(async ({ ctx: { db, session, emailQueue }, input }) => {
			if (!emailQueue) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'email_queue_not_configured'
				});
			}

			const organizationId = session.session.activeOrganizationId;
			const organization = await db.query.organization.findFirst({
				where: eq(schema.organization.id, organizationId!)
			});
			if (!organization) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'branch_not_found'
				});
			}

			const job: EmailQueueMessage = {
				version: 'v2',
				eventType: 'TEST_TEMPLATE',
				templateType: input.templateType,
				organizationId: organizationId!,
				recipientEmail: input.email
			};

			await emailQueue.send(job);
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
		.query(async ({ ctx: { db, session } }) => {
			const organizationId = session.session.activeOrganizationId!;
			const communications = await db
				.select()
				.from(schema.communicationSetting)
				.where(eq(schema.communicationSetting.organizationId, organizationId));

			return communications.map((communication) => {
				const settings = communication.settings;
				return {
					enabled: !!communication.enabled,
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
		.mutation(async ({ input, ctx: { db, session } }) => {
			const orgId = session.session.activeOrganizationId!;

			const batchQueries = input.communications.map((communication) => {
				const { type, enabled, ...rest } = communication;

				return db
					.insert(schema.communicationSetting)
					.values({
						id: crypto.randomUUID(),
						type: type,
						organizationId: orgId,
						enabled,
						settings: rest,
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: [schema.communicationSetting.type, schema.communicationSetting.organizationId],
						set: {
							enabled,
							settings: rest,
							updatedAt: new Date()
						}
					})
					.returning();
			});

			const results = await db.batch(batchQueries);
			return results;
		})
});
