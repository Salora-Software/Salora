import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { schema } from '@salora/database';
import {
	getAllowedTemplateVariablePaths,
	validateTemplateRecordVariables,
	validateTemplateVariables
} from '@salora/emails';
import type { PrivateContext } from '$lib/server/trpc/context';
import type { UpsertTemplateInput } from './upsert-template.schema';

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

	return unknown.map((path) =>
		`Onbekende variabele: {{ ${path} }}. Gebruik dot-path variabelen zoals {{ customer.name }}.`
	);
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

export const upsertTemplateHandler = async ({
	input: { organizationId, type, subject, body, target },
	ctx: { db, session }
}: {
	input: UpsertTemplateInput;
	ctx: PrivateContext;
}) => {
	const orgId = getActiveOrganizationId(session, organizationId);
	const parsedBody = parseTemplateBody(body);
	const warnings = getTemplateVariableWarnings(target, subject, parsedBody);

	const existingTemplate = await db.query.template.findFirst({
		where: and(
			eq(schema.template.type, type),
			eq(schema.template.target, target),
			eq(schema.template.organizationId, orgId)
		)
	});

	if (existingTemplate) {
		await db
			.update(schema.template)
			.set({
				subject,
				body,
				updatedAt: new Date()
			})
			.where(eq(schema.template.id, existingTemplate.id));
	} else {
		await db.insert(schema.template).values({
			id: crypto.randomUUID(),
			type,
			target,
			organizationId: orgId,
			subject,
			body,
			enabled: true,
			updatedAt: new Date()
		});
	}

	return {
		success: true,
		warnings
	};
};