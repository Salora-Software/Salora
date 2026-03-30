import { replaceVariables } from '$lib/templateReplacer';
import { Emailer } from '@salora/mailer';
import { env } from '$lib/server/env';
import type { getOrganization } from './general';
import { schema } from '@salora/database';
import { eq, and, inArray } from 'drizzle-orm';

class NotificationService {
	constructor() {}

	async sendEmailNotification({
		type,
		target,
		branch,
		to,
		employeeEmail,
		variables,
		customTemplate
	}: {
		type?: string; // Replace $Enums.TemplateType
		target?: string;
		branch: Awaited<ReturnType<typeof getOrganization>>;
		to: string;
		employeeEmail?: string;
		variables: Record<string, any>;
		customTemplate?: {
			subject: string;
			body: string;
			enabled?: boolean;
		};
	}) {
		const targets: string[] = target ? [target] : ['CUSTOMER', 'EMPLOYEE'];
	}
}

export const notificationService = new NotificationService();
