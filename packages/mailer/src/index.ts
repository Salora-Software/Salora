import nodemailer from 'nodemailer';

export * from './queue';

export interface MailCredential {
  provider_name: string;
  priority: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
  password: string;
}

export interface EmailSendData {
  senderName: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  credentials: MailCredential[];
}

export interface SendResult {
  success: boolean;
  provider: string;
}

const RETRYABLE_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ESOCKET'
]);

export const isRetryableEmailError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code && RETRYABLE_ERROR_CODES.has(code)) return true;

  const responseCode = (error as { responseCode?: number }).responseCode;
  if (typeof responseCode === 'number') {
    return responseCode >= 400 && responseCode < 500;
  }

  const message = (error as { message?: string }).message;
  if (!message) return false;
  return /timeout|temporar|rate|throttl|network/i.test(message);
};

const isCredentialUsable = (credential: MailCredential) =>
  Boolean(
    credential.smtp_host?.trim() &&
      credential.smtp_port &&
      credential.username?.trim() &&
      credential.password?.trim()
  );

export async function sendEmailWithFailover(data: EmailSendData): Promise<SendResult> {
  const { senderName, from, to, subject, body, credentials } = data;
  const sortedCredentials = [...credentials]
    .filter(isCredentialUsable)
    .sort((a, b) => a.priority - b.priority);

  if (sortedCredentials.length === 0) {
    throw new Error('No valid SMTP credentials configured');
  }

  let lastError: unknown;
  for (const provider of sortedCredentials) {
    try {
      const transporter = nodemailer.createTransport({
        host: provider.smtp_host,
        port: provider.smtp_port,
        secure: false,
        auth: { user: provider.username, pass: provider.password }
      });

      await transporter.sendMail({
        from: `${senderName} <${from}>`,
        to,
        subject,
        html: body
      });

      return {
        success: true,
        provider: provider.provider_name
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All email providers exhausted');
}
