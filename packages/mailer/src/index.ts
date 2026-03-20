import nodemailer from "nodemailer";

export interface RedisQueueClient {
  lpush: (key: string, value: string) => Promise<unknown>;
}

export interface MailCredential {
  provider_name: string;
  priority: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
  password: string;
}

export interface EmailJobData {
  senderName: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  credentials: MailCredential[];
  attempt: number;
}

export const QUEUE_NAME = "emailQueue";

export class Emailer {
  constructor(
    private redis: RedisQueueClient | null = null,
    private credentials: MailCredential[],
  ) {}

  public async sendEmail(
    senderName: string,
    from: string,
    to: string,
    subject: string,
    body: string,
  ) {
    if (!this.redis) {
      console.error(
        "❌ Emailer has not been initialized. Please make sure the 'init' method is called.",
      );
      return;
    }

    const data: EmailJobData = {
      senderName,
      from,
      to,
      subject,
      body,
      credentials: this.credentials,
      attempt: 0,
    };

    await this.redis.lpush(QUEUE_NAME, JSON.stringify(data));

    console.log(`📩 Email job queued for ${to} from ${senderName}`);
  }
}

export async function sendEmailWithFailover(
  jobData: EmailJobData,
  redis: RedisQueueClient,
) {
  const {
    senderName,
    from,
    to,
    subject,
    body,
    credentials,
    attempt = 0,
  } = jobData;

  if (!credentials || attempt >= credentials.length) {
    console.error(`❌ All email providers failed for ${to}.`);
    throw new Error("All email providers exhausted");
  }

  const sortedCredentials = [...credentials].sort(
    (a, b) => a.priority - b.priority,
  );
  const provider = sortedCredentials[attempt];

  try {
    console.log(
      `📨 Attempting to send email to ${to} using ${provider.provider_name} (Priority ${provider.priority} with ${provider.smtp_host}, attempts: ${attempt})`,
    );
    const transporter = nodemailer.createTransport({
      host: provider.smtp_host,
      port: provider.smtp_port,
      secure: false,
      auth: { user: provider.username, pass: provider.password },
    });
    await transporter.sendMail({
      from: `${senderName} <${from}>`,
      to,
      subject,
      html: body,
    });

    console.log(`✅ Email sent to ${to} using ${provider.provider_name}`);
  } catch (error) {
    let errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ Failed to send email using ${provider.provider_name}, retrying... Error:`,
      errorMsg,
    );

    if (attempt + 1 < credentials.length) {
      console.log(
        `🔄 Re-queuing email to ${to} for next provider (attempt ${attempt + 1})`,
      );
      // In a real production system with delay, we'd use a separate delayed queue or ZSET.
      // For simplicity and to match the request, we re-queue.
      const nextJobData: EmailJobData = { ...jobData, attempt: attempt + 1 };

      // Simple delay before re-queuing
      setTimeout(async () => {
        await redis.lpush(QUEUE_NAME, JSON.stringify(nextJobData));
      }, 5000);
    } else {
      console.error(`❌ All email providers exhausted for ${to}.`);
      throw new Error("All email providers exhausted");
    }
  }
}
