import { replaceVariables } from '$lib/templateReplacer';
import { Emailer } from '@salora/mailer';
import {
	MAIL_FALLBACK_SERVER,
	MAIL_FALLBACK_PORT,
	MAIL_FALLBACK_USERNAME,
	MAIL_FALLBACK_PASSWORD,
	MAIL_EMAIL_SENDER
} from '$env/static/private';
import type { getOrganization } from './general';
import type { $Enums } from '@salora/database';
import redis from '$lib/server/redis';
import type { QueueRedisClient } from '$lib/server/redis';

import { prisma as prismaInstance } from './prisma';

class NotificationService {
	constructor(
		private prisma: typeof prismaInstance,
		private redis: QueueRedisClient | null = null
	) {}

	async sendEmailNotification({
		type,
		target,
		branch,
		to,
		employeeEmail,
		variables,
		customTemplate
	}: {
		type?: $Enums.TemplateType; // Make type optional
		target?: $Enums.TemplateTarget;
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
		const targets: $Enums.TemplateTarget[] = target ? [target] : ['CUSTOMER', 'EMPLOYEE'];

		const communication = await this.prisma.communicationSetting.findFirst({
			where: {
				organizationId: branch.id,
				type: 'EMAIL'
			}
		});

		const formatted = communication
			? (() => {
					const settings = communication.settings as {
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

		const emailer = new Emailer(this.redis, [
			{
				provider_name: 'EMAIL FALLBACK',
				priority: 100,
				smtp_host: MAIL_FALLBACK_SERVER,
				smtp_port: parseInt(MAIL_FALLBACK_PORT, 10),
				username: MAIL_FALLBACK_USERNAME,
				password: MAIL_FALLBACK_PASSWORD
			},
			...(formatted ? [formatted] : [])
		]);

		const templates = customTemplate
			? null
			: await this.prisma.template.findMany({
					where: {
						organizationId: branch.id,
						...(type ? { type } : {}),
						target: {
							in: targets
						}
					}
				});

		const templateMap = customTemplate
			? null
			: Object.fromEntries(templates!.map((t) => [t.target, t]));

		for (const tgt of targets) {
			const template = customTemplate || templateMap?.[tgt];
			if (!template) continue;
			if (!customTemplate && template.enabled) continue;

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
			const from = communication?.settings
				? (communication.settings as { smtpEmail?: string })?.smtpEmail || MAIL_EMAIL_SENDER
				: MAIL_EMAIL_SENDER;
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

export const notificationService = new NotificationService(prismaInstance, redis);
