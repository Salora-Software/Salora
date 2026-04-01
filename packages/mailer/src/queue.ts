export const EMAIL_QUEUE_NAME = "email-jobs";

export interface TemplateEmailQueueMessage {
  version?: "v2";
  eventType?: "TEST_TEMPLATE" | string;
  templateType: string;
  organizationId: string;
  recipientEmail?: string;
  bookingId?: string;
}

export type EmailQueueMessage = TemplateEmailQueueMessage;

export const isTemplateEmailQueueMessage = (
  value: unknown,
): value is TemplateEmailQueueMessage => {
  if (!value || typeof value !== "object") return false;
  const msg = value as Partial<TemplateEmailQueueMessage>;

  if (typeof msg.templateType !== "string") return false;
  if (typeof msg.organizationId !== "string") return false;
  if (msg.eventType === "TEST_TEMPLATE") {
    return typeof msg.recipientEmail === "string";
  }

  return (
    typeof msg.recipientEmail === "string" || typeof msg.bookingId === "string"
  );
};

export const isEmailQueueMessage = (
  value: unknown,
): value is EmailQueueMessage => {
  return isTemplateEmailQueueMessage(value);
};
