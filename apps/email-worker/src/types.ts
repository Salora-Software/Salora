export interface Env {
  DB: unknown;
  MAIL_FALLBACK_SERVER?: string;
  MAIL_FALLBACK_PORT?: string;
  MAIL_FALLBACK_USERNAME?: string;
  MAIL_FALLBACK_PASSWORD?: string;
  MAIL_EMAIL_SENDER?: string;
}

export interface QueueMessage {
  body: unknown;
  ack: () => void;
  retry: () => void;
}

export interface QueueBatch {
  messages: QueueMessage[];
}
