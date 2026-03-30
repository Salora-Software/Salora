import { replaceVariables } from '$lib/templateReplacer';
import { Emailer } from '@salora/mailer';
import { env } from '$lib/server/env';
import type { getOrganization } from './general';
import { db } from '@salora/database';
import { communicationSetting, template as templateTable } from '@salora/database/src/db/schema';
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

		const [communication] = await db
			.select()
			.from(communicationSetting)
			.where(
				and(
					eq(communicationSetting.organizationId, branch.id),
					eq(communicationSetting.type, 'EMAIL')
				)
			)
			.limit(1);

		const formatted = communication
			? (() => {
					const settings = JSON.parse(communication.settings as string) as {
						smtpServer: string;
						smtpPort: number;
						smtpUsername: string;
						smtpPassword: string;
					};
					return {
						provider_name: communication.type,
						priority: 10,
						smtp_host: settings.smtpServer,
						smtp_port: settings.smtpPort,
						username: settings.smtpUsername,
						password: settings.smtpPassword
					};
				})()
			: null;

		const emailer = new Emailer(null, [
			{
				provider_name: 'EMAIL FALLBACK',
				priority: 100,
				smtp_host: env?.MAIL_FALLBACK_SERVER,
				smtp_port: env?.MAIL_FALLBACK_PORT,
				username: env?.MAIL_FALLBACK_USERNAME,
				password: env?.MAIL_FALLBACK_PASSWORD
			},
			...(formatted ? [formatted] : [])
		]);

		const templates = customTemplate
			? null
			: await db
					.select()
					.from(templateTable)
					.where(
						and(
							eq(templateTable.organizationId, branch.id),
							type ? eq(templateTable.type, type) : undefined,
							inArray(templateTable.target, targets)
						)
					);

		const templateMap = customTemplate
			? null
			: Object.fromEntries(templates!.map((t) => [t.target, t]));

		for (const tgt of targets) {
			const template = customTemplate || templateMap?.[tgt];
			if (!template) continue;
			if (!customTemplate && !template.enabled) continue;

			const defaultVariables = {
				branch,
				date: {
					year: new Date().getFullYear(),
					month: new Date().getMonth() + 1,
					day: new Date().getDate(),
					hour: new Date().getHours(),
					minute: new Date().getMinutes()
				},
				...variables
			};
			const subject = replaceVariables(template.subject ?? '', defaultVariables);
			const body = replaceVariables(template.body ?? '', defaultVariables);

			const settings = communication?.settings
				? (JSON.parse(communication.settings as string) as { smtpEmail?: string })
				: null;
			const from = settings?.smtpEmail || MAIL_EMAIL_SENDER;

			// if no target send to both
			if (!tgt) {
				await emailer.sendEmail(subject, from, to, subject, body);
				await emailer.sendEmail(subject, from, employeeEmail!, subject, body);
			} else {
				if (tgt === 'CUSTOMER' ? to : employeeEmail!)
					await emailer.sendEmail(
						subject,
						from,
						tgt === 'CUSTOMER' ? to : employeeEmail!,
						subject,
						body
					);
			}
		}
	}
}

export const notificationService = new NotificationService();
