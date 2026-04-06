import {
	isEmailQueueMessage,
	isRetryableEmailError,
	sendEmailWithFailover,
} from "@salora/mailer";
import { getCredentials } from "./credentials";
import type { Env, QueueBatch } from "./types";
import { resolveTemplateEmail } from "./template-email";

const DEFAULT_SENDER = "noreply@salora.app";

const processQueueMessage = async (
	message: QueueBatch["messages"][number],
	env: Env,
): Promise<void> => {
	const payload = message.body;

	if (!isEmailQueueMessage(payload)) {
		console.error("Dropping invalid queue payload", payload);
		message.ack();
		return;
	}

	try {
		const organizationId = payload.organizationId;
		const credentials = await getCredentials(env, organizationId);

		if (credentials.length === 0) {
			console.error("No SMTP credentials available", {
				organizationId,
			});
			message.ack();
			return;
		}

		const renderedEmail = await resolveTemplateEmail(payload, env);

		if (!renderedEmail) {
			console.info("Email skipped by template resolver", {
				organizationId,
				templateType: payload.templateType,
				targetAudience: payload.targetAudience ?? "CUSTOMER",
			});
			message.ack();
			return;
		}

		await sendEmailWithFailover({
			senderName: renderedEmail.senderName,
			from: renderedEmail.from || env.MAIL_EMAIL_SENDER || DEFAULT_SENDER,
			to: renderedEmail.to,
			subject: renderedEmail.subject,
			body: renderedEmail.body,
			credentials,
		});

		message.ack();
	} catch (error) {
		const retryable = isRetryableEmailError(error);
		console.error("Email delivery failed", {
			organizationId:
				typeof payload === "object" &&
					payload !== null &&
					"organizationId" in payload
					? (payload as { organizationId?: string }).organizationId
					: undefined,
			retryable,
			error,
		});

		if (!retryable) {
			message.ack();
			return;
		}

		message.retry();
	}
};

export default {
	async queue(batch: QueueBatch, env: Env): Promise<void> {
		for (const message of batch.messages) {
			await processQueueMessage(message, env);
		}
	},
};
