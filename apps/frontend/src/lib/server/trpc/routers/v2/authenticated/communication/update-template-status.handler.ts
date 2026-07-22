import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { schema } from '@salora/database';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { UpdateTemplateStatusInput } from './update-template-status.schema';

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

const getActiveOrganizationId = (session: unknown, fallback?: string): string => {
	const sessionValue = (session as any)?.session?.activeOrganizationId;
	const directValue = (session as any)?.activeOrganizationId;
	const organizationId = sessionValue || directValue || fallback;

	if (!organizationId) {
		throw new TRPCError({
			code: 'PRECONDITION_FAILED',
			message: 'active_organization_not_found'
		});
	}

	return organizationId;
};

export const updateTemplateStatusHandler = async ({
	input: { organizationId, type, target, enabled },
	ctx: { db, session }
}: {
	input: UpdateTemplateStatusInput;
	ctx: PrivateContext;
}) => {
	const orgId = getActiveOrganizationId(session, organizationId);

	const updated = await db
		.update(schema.template)
		.set({ enabled })
		.where(
			and(
				eq(schema.template.type, type),
				eq(schema.template.target, target),
				eq(schema.template.organizationId, orgId)
			)
		)
		.returning();

	if (updated.length > 0) {
		return updated;
	}

	const [created] = await db
		.insert(schema.template)
		.values({
			id: crypto.randomUUID(),
			type,
			target,
			organizationId: orgId,
			subject: getDefaultSubject(type),
			body: getDefaultTemplateBody(type),
			enabled,
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
};
