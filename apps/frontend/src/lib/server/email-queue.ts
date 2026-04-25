import type { EmailQueueMessage } from '@salora/mailer';

type TemplateType = 'EMAIL_APPROVED' | 'EMAIL_DENIED' | 'EMAIL_CANCELED' | 'EMAIL_CREATED';

interface QueueTargetInfo {
	customerEmail?: string | null;
	employeeEmail?: string | null;
}

export const enqueueTemplateEmail = async (
	emailQueue: Queue<EmailQueueMessage> | undefined,
	params: {
		templateType: TemplateType;
		organizationId: string;
		bookingId: string;
		targets: QueueTargetInfo;
		origin: string;
	}
): Promise<void> => {
	if (!emailQueue) return;

	const { templateType, organizationId, bookingId, targets, origin } = params;
	const baseJob = {
		version: 'v3' as const,
		templateType,
		organizationId,
		bookingId,
		origin
	};

	const jobs: EmailQueueMessage[] = [];

	if (targets.customerEmail) {
		jobs.push({
			...baseJob,
			targetAudience: 'CUSTOMER'
		});
	}

	if (targets.employeeEmail) {
		jobs.push({
			...baseJob,
			targetAudience: 'EMPLOYEE'
		});
	}

	if (jobs.length === 0) return;

	await Promise.all(jobs.map((job) => emailQueue.send(job)));
};
