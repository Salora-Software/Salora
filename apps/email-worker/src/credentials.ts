import { createDb, schema } from "@salora/database";
import type { MailCredential } from "@salora/mailer";
import type { Env } from "./types";

const toPort = (value?: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

export const getCredentials = async (
  env: Env,
  organizationId: string,
): Promise<MailCredential[]> => {
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
