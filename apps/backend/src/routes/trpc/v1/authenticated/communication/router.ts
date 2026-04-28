import { z } from 'zod';
import { router as createRouter, privateProcedure, publicProcedure } from '@/middleware/trpc';
import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';
import {
	renderEmail,
	getAllowedTemplateVariablePaths,
	validateTemplateRecordVariables,
	validateTemplateVariables
} from '@salora/emails';
import type { MailCredential } from '@salora/mailer';


const DEFAULT_SENDER = 'noreply@salora.app';

const getDefaultSubject = (templateType: string): string => {
	switch (templateType) {
		case 'EMAIL_APPROVED':
			return 'Je afspraak is bevestigd';
		case 'EMAIL_CANCELED':
			return 'Je afspraak is geannuleerd';
		case 'EMAIL_DENIED':
			return 'Update over je afspraak';
		case 'EMAIL_CREATED':
			return 'Je afspraakaanvraag is ontvangen';
		default:
			return 'Update over je afspraak';
	}
};

const getDefaultHeading = (templateType: string): string => {
	switch (templateType) {
		case 'EMAIL_APPROVED':
			return 'Afspraak Bevestigd';
		case 'EMAIL_CANCELED':
			return 'Afspraak Geannuleerd';
		case 'EMAIL_DENIED':
			return 'Afspraak Gewijzigd';
		case 'EMAIL_CREATED':
			return 'Afspraak In Behandeling';
		default:
			return 'Afspraak Update';
	}
};

const getDefaultContent = (templateType: string): string => {
	switch (templateType) {
		case 'EMAIL_CREATED':
			return 'Beste {{ customer.name }},\n\nJe afspraakaanvraag is ontvangen en wacht op goedkeuring.';
		case 'EMAIL_CANCELED':
			return 'Beste {{ customer.name }},\n\nJe afspraak is geannuleerd.';
		case 'EMAIL_APPROVED':
			return 'Beste {{ customer.name }},\n\nJe afspraak is bevestigd.';
		default:
			return 'Beste {{ customer.name }},\n\nEr is een update over je afspraak.';
	}
};

const getDefaultTemplateBody = (templateType: string): string => {
	return JSON.stringify({
		companyName: 'Salora Beauty',
		heading: getDefaultHeading(templateType),
		content: getDefaultContent(templateType),
		buttonText: 'Bekijk Afspraak'
	});
};

const getValueByPath = (data: Record<string, unknown>, path: string): unknown => {
	return path.split('.').reduce<unknown>((acc, part) => {
		if (typeof acc !== 'object' || acc === null) return undefined;
		return (acc as Record<string, unknown>)[part];
	}, data);
};

const replaceTemplateVariables = (template: string, data: Record<string, unknown>): string => {
	return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
		const value = getValueByPath(data, path.trim());
		if (value === null || value === undefined) return '';
		return String(value);
	});
};

const parseTemplateBody = (body?: string | null): Record<string, unknown> => {
	if (!body) return {};

	try {
		const parsed = JSON.parse(body) as unknown;
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return { content: body };
	}

	return {};
};

const interpolateRecord = (value: unknown, data: Record<string, unknown>): unknown => {
	if (typeof value === 'string') {
		return replaceTemplateVariables(value, data);
	}

	if (Array.isArray(value)) {
		return value.map((item) => interpolateRecord(item, data));
	}

	if (typeof value === 'object' && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = interpolateRecord(v, data);
		}
		return out;
	}

	return value;
};

const toStringValue = (value: unknown, fallback = ''): string => {
	return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

const getTemplateVariableWarnings = (
	target: string,
	subject: string,
	bodyRecord: Record<string, unknown>
): string[] => {
	const audience = target === 'EMPLOYEE' ? 'EMPLOYEE' : 'CUSTOMER';
	const allowedPaths = getAllowedTemplateVariablePaths(audience);
	const subjectValidation = validateTemplateVariables(subject, allowedPaths);
	const bodyValidation = validateTemplateRecordVariables(bodyRecord, allowedPaths);
	const unknown = [...new Set([...subjectValidation.unknown, ...bodyValidation.unknown])];

	return unknown.map(
		(path) =>
			`Onbekende variabele: {{ ${path} }}. Gebruik dot-path variabelen zoals {{ customer.name }}.`
	);
};

const buildCredentials = (communication: any): MailCredential[] => {
	const settings = communication?.settings ?? {};

	const orgCredential: MailCredential | null =
		settings.smtpServer && settings.smtpUsername && settings.smtpPassword
			? {
				provider_name: 'Organization SMTP',
				priority: 10,
				from: settings.smtpEmail,
				smtp_host: settings.smtpServer,
				smtp_port: Number(settings.smtpPort ?? 587),
				username: settings.smtpUsername,
				password: settings.smtpPassword
			}
			: null;


	return [orgCredential].filter(
		(cred): cred is MailCredential => cred !== null
	);
};

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
			const orgId = session.session.activeOrganizationId!;
			const updated = await db
				.update(schema.template)
				.set({ enabled: input.enabled })
				.where(
					and(
						eq(schema.template.type, input.type),
						eq(schema.template.target, input.target),
						eq(schema.template.organizationId, orgId)
					)
				)
				.returning();

			if (updated.length === 0) {
				const [created] = await db
					.insert(schema.template)
					.values({
						id: crypto.randomUUID(),
						type: input.type,
						target: input.target,
						organizationId: orgId,
						subject: getDefaultSubject(input.type),
						body: getDefaultTemplateBody(input.type),
						enabled: input.enabled,
						updatedAt: new Date()
					})
					.returning();

				if (!created) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'template_create_failed'
					});
				}

				return [created];
			}

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
			const parsedBody = parseTemplateBody(input.body);
			const warnings = getTemplateVariableWarnings(input.target, input.subject, parsedBody);
			const orgId = session.session.activeOrganizationId!;

			const existingTemplate = await db.query.template.findFirst({
				where: and(
					eq(schema.template.type, input.type),
					eq(schema.template.target, input.target),
					eq(schema.template.organizationId, orgId)
				)
			});

			if (existingTemplate) {
				await db
					.update(schema.template)
					.set({
						subject: input.subject,
						body: input.body,
						updatedAt: new Date()
					})
					.where(eq(schema.template.id, existingTemplate.id));
			} else {
				await db.insert(schema.template).values({
					id: crypto.randomUUID(),
					type: input.type,
					target: input.target,
					organizationId: orgId,
					subject: input.subject,
					body: input.body,
					enabled: true,
					updatedAt: new Date()
				});
			}

			return {
				success: true,
				warnings
			};
		}),
	sendTestEmail: privateProcedure
		.input(
			z.object({
				templateType: z.string(),
				email: z.string().email()
			})
		)
		.output(z.any())
		.mutation(async ({ ctx: { db, session }, input }) => {
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

			const communication = await db.query.communicationSetting.findFirst({
				where: and(
					eq(schema.communicationSetting.organizationId, organizationId!),
					eq(schema.communicationSetting.type, 'EMAIL')
				)
			});

			const credentials = buildCredentials(communication);
			if (credentials.length === 0) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message: 'smtp_not_configured'
				});
			}

			const template = await db.query.template.findFirst({
				where: and(
					eq(schema.template.organizationId, organizationId!),
					eq(schema.template.type, input.templateType),
					eq(schema.template.target, 'CUSTOMER'),
					eq(schema.template.enabled, true)
				)
			});

			const variables: Record<string, unknown> = {
				customer: {
					name: 'Test Klant',
					email: input.email
				},
				employee: {
					name: 'Test Medewerker'
				},
				booking: {
					name: 'Intake',
					date: '12 mei 2026',
					time: '14:00',
					location: organization.location || 'Onbekende locatie'
				},
				branch: {
					name: organization.name
				}
			};

			const parsedBody = parseTemplateBody(template?.body as string | undefined);
			const interpolatedBody = interpolateRecord(parsedBody, variables) as Record<string, unknown>;
			const detailsInput =
				typeof interpolatedBody.details === 'object' && interpolatedBody.details !== null
					? (interpolatedBody.details as Record<string, unknown>)
					: {};

			const mailProps = {
				companyName: toStringValue(interpolatedBody.companyName, organization.name),
				companyAddress: toStringValue(interpolatedBody.companyAddress, organization.location || ''),
				heading: toStringValue(interpolatedBody.heading, getDefaultHeading(input.templateType)),
				content: toStringValue(interpolatedBody.content, getDefaultContent(input.templateType)),
				buttonText: toStringValue(interpolatedBody.buttonText, 'Bekijk afspraak'),
				buttonLink: toStringValue(interpolatedBody.buttonLink, 'https://salora.app'),
				details: {
					date: toStringValue(detailsInput.date, '12 mei 2026'),
					time: toStringValue(detailsInput.time, '14:00'),
					location: toStringValue(
						detailsInput.location,
						organization.location || 'Onbekende locatie'
					)
				}
			};

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
