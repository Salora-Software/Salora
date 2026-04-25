export const EMAIL_QUEUE_NAME = "email-jobs";

export type EmailTargetAudience = "CUSTOMER" | "EMPLOYEE";

export interface TemplateEmailQueueMessage {
  version?: "v3";
  eventType?: "TEST_TEMPLATE" | string;
  origin: string;
  templateType: string;
  organizationId: string;
  bookingId?: string;
  targetAudience?: EmailTargetAudience;
}

export type EmailQueueMessage = TemplateEmailQueueMessage;

export const isTemplateEmailQueueMessage = (
  value: unknown,
): value is TemplateEmailQueueMessage => {
  if (!value || typeof value !== "object") return false;
  const msg = value as Partial<TemplateEmailQueueMessage>;

  if (typeof msg.templateType !== "string") return false;
  if (typeof msg.organizationId !== "string") return false;
  if (
    msg.targetAudience !== undefined &&
    msg.targetAudience !== "CUSTOMER" &&
    msg.targetAudience !== "EMPLOYEE"
  ) {
    return false;
  }

  if (msg.eventType === "TEST_TEMPLATE") {
    return true;
  }

  return typeof msg.bookingId === "string";
};

export const isEmailQueueMessage = (
  value: unknown,
): value is EmailQueueMessage => {
  return isTemplateEmailQueueMessage(value);
};
