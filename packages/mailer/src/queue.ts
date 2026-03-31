export const EMAIL_QUEUE_NAME = 'email-jobs';

export interface EmailQueueMessage {
	version: 'v1';
	jobId: string;
	organizationId: string;
	senderName: string;
	from: string;
	to: string;
	subject: string;
	body: string;
	createdAt: string;
	idempotencyKey: string;
	source: 'frontend-trpc';
}

export const isEmailQueueMessage = (value: unknown): value is EmailQueueMessage => {
	if (!value || typeof value !== 'object') return false;
	const msg = value as Partial<EmailQueueMessage>;
	return (
		msg.version === 'v1' &&
		typeof msg.jobId === 'string' &&
		typeof msg.organizationId === 'string' &&
		typeof msg.senderName === 'string' &&
		typeof msg.from === 'string' &&
		typeof msg.to === 'string' &&
		typeof msg.subject === 'string' &&
		typeof msg.body === 'string' &&
		typeof msg.createdAt === 'string' &&
		typeof msg.idempotencyKey === 'string' &&
		msg.source === 'frontend-trpc'
	);
};
