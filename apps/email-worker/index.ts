import { createDb, schema } from "@salora/database";
import {
  isEmailQueueMessage,
  isRetryableEmailError,
  sendEmailWithFailover,
  type MailCredential,
} from "@salora/mailer";

interface Env {
  DB: unknown;
  MAIL_FALLBACK_SERVER?: string;
  MAIL_FALLBACK_PORT?: string;
  MAIL_FALLBACK_USERNAME?: string;
  MAIL_FALLBACK_PASSWORD?: string;
  MAIL_EMAIL_SENDER?: string;
}

interface QueueMessage {
  body: unknown;
  ack: () => void;
  retry: () => void;
}

interface QueueBatch {
  messages: QueueMessage[];
}

const toPort = (value?: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

const getCredentials = async (env: Env, organizationId: string) => {
  const db = createDb(env.DB as any);
  const allCommunications = await db.select().from(schema.communicationSetting);
  const communication = allCommunications.find(
    (item) => item.organizationId === organizationId && item.type === "EMAIL",
  );

  const settings = communication?.settings ?? {};

  const orgCredential: MailCredential | null =
    settings.smtpServer && settings.smtpUsername && settings.smtpPassword
      ? {
          provider_name: "Organization SMTP",
          priority: 10,
          from: settings.smtpEmail,
          smtp_host: settings.smtpServer,
          smtp_port: Number(settings.smtpPort ?? 587),
          username: settings.smtpUsername,
          password: settings.smtpPassword,
        }
      : null;

  const fallbackCredential: MailCredential | null =
    env.MAIL_FALLBACK_SERVER &&
    env.MAIL_FALLBACK_USERNAME &&
    env.MAIL_FALLBACK_PASSWORD
      ? {
          provider_name: "Fallback SMTP",
          priority: 100,
          smtp_host: env.MAIL_FALLBACK_SERVER,
          smtp_port: toPort(env.MAIL_FALLBACK_PORT),
          username: env.MAIL_FALLBACK_USERNAME,
          password: env.MAIL_FALLBACK_PASSWORD,
        }
      : null;

  return [orgCredential, fallbackCredential].filter(
    (cred): cred is MailCredential => cred !== null,
  );
};

export default {
  async queue(batch: QueueBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const payload = message.body;

      if (!isEmailQueueMessage(payload)) {
        console.error("Dropping invalid queue payload", payload);
        message.ack();
        continue;
      }

      try {
        const credentials = await getCredentials(env, payload.organizationId);
        if (credentials.length === 0) {
          console.error("No SMTP credentials available", {
            jobId: payload.jobId,
            organizationId: payload.organizationId,
          });
          message.ack();
          continue;
        }

        await sendEmailWithFailover({
          senderName: payload.senderName,
          from: payload.from || env.MAIL_EMAIL_SENDER || "noreply@salora.app",
          to: payload.to,
          subject: payload.subject,
          body: payload.body,
          credentials,
        });

        message.ack();
      } catch (error) {
        const retryable = isRetryableEmailError(error);
        console.error("Email delivery failed", {
          jobId: payload.jobId,
          organizationId: payload.organizationId,
          retryable,
          error,
        });

        if (!retryable) {
          message.ack();
          continue;
        }

        message.retry();
      }
    }
  },
};
