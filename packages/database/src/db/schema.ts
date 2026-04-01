import {
  sqliteTable,
  foreignKey,
  text,
  real,
  integer,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const commonColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  createdAt: integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .$onUpdateFn(() => new Date())
    .notNull(),
};

// 1. Definieer je enums als constante arrays
export const calendarItemTypes = [
  "AVAILABILITY",
  "TIME_OFF",
  "BOOKING",
  "NOTE",
] as const;
export enum CalendarItemTypes {
  AVAILABILITY = "AVAILABILITY",
  TIME_OFF = "TIME_OFF",
  BOOKING = "BOOKING",
  NOTE = "NOTE",
}
export const templateTargets = ["CUSTOMER", "EMPLOYEE"] as const;
export enum TemplateTargets {
  CUSTOMER = "CUSTOMER",
  EMPLOYEE = "EMPLOYEE",
}
export const templateTypes = [
  "EMAIL_APPROVED",
  "EMAIL_DENIED",
  "EMAIL_CANCELED",
  "EMAIL_CREATED",
  "SMS_APPROVED",
  "SMS_DENIED",
  "SMS_CANCELED",
] as const;
export enum TemplateTypes {
  EMAIL_APPROVED = "EMAIL_APPROVED",
  EMAIL_DENIED = "EMAIL_DENIED",
  EMAIL_CANCELED = "EMAIL_CANCELED",
  EMAIL_CREATED = "EMAIL_CREATED",
  SMS_APPROVED = "SMS_APPROVED",
  SMS_DENIED = "SMS_DENIED",
  SMS_CANCELED = "SMS_CANCELED",
}
export const communicationTypes = ["EMAIL", "SMS"] as const;
export enum CommunicationTypes {
  EMAIL = "EMAIL",
  SMS = "SMS",
}
export const bookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
] as const;
export enum BookingStatuses {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}
export const timeOffTypes = ["LEAVE", "SPECIAL"] as const;
export enum TimeOffTypes {
  LEAVE = "LEAVE",
  SPECIAL = "SPECIAL",
}
export const invitationStatuses = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "ACTIVE",
] as const;
export enum InvitationStatuses {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  ACTIVE = "ACTIVE",
}

export const account = sqliteTable(
  "account",
  {
    ...commonColumns,
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: text(),
    refreshTokenExpiresAt: text(),
    scope: text(),
    password: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const organization = sqliteTable(
  "organization",
  {
    ...commonColumns,
    name: text().notNull(),
    slug: text(),
    logo: text(),
    metadata: text(),
    maxMembers: integer(),
    location: text(),
    website: text(),
    phone: text(),
    email: text(),
    timeZone: text().notNull(),
    appointmentStatus: text().default("PENDING").notNull(),
    minimumBookingTime: real().default(0.5).notNull(),
    bookingPeriod: integer().default(365).notNull(),
    autoShiftTimeSlot: integer({ mode: "boolean" }).default(false).notNull(),
    onboardingStep: integer().default(0),
  },
  (table) => [],
);

export const openingTime = sqliteTable(
  "opening_time",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    dayOfWeek: integer().notNull(),
    startTimeUtc: integer({ mode: "timestamp" }).notNull(),
    endTimeUtc: integer({ mode: "timestamp" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "opening_time_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const verification = sqliteTable("verification", {
  ...commonColumns,
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
});

export const member = sqliteTable(
  "member",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    userId: text().notNull(),
    role: text().notNull(),
    invitationStatus: text().default("ACTIVE").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "member_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "member_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const customer = sqliteTable(
  "customer",
  {
    ...commonColumns,
    authToken: text(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    address: text(),
    organizationId: text().notNull(),
    userId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "customer_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "customer_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const invitation = sqliteTable(
  "invitation",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    email: text().notNull(),
    role: text(),
    status: text().notNull(),
    expiresAt: integer({ mode: "timestamp" }).notNull(),
    inviterId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "invitation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [user.id],
      name: "invitation_inviterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const user = sqliteTable("user", {
  ...commonColumns,
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: integer({ mode: "boolean" }).notNull(),
  image: text(),
  phone: text(),
});

export const employeeService = sqliteTable(
  "employee_service",
  {
    ...commonColumns,
    memberId: text().notNull(),
    serviceId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [member.id],
      name: "employee_service_memberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [service.id],
      name: "employee_service_serviceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const service = sqliteTable(
  "service",
  {
    ...commonColumns,
    name: text().notNull(),
    description: text(),
    sortingIndex: integer().default(-1).notNull(),
    duration: integer().notNull(),
    price: real().notNull(),
    organizationId: text().notNull(),
    visible: integer({ mode: "boolean" }).default(true),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "service_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const calendarItem = sqliteTable(
  "calendar_item",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    title: text(),
    employeeId: text(),
    startTime: integer({ mode: "timestamp" }).notNull(),
    endTime: integer({ mode: "timestamp" }).notNull(),
    type: text().notNull(),
    notes: text(),
    bookingId: text(),
    timeOffId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "calendar_item_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.employeeId],
      foreignColumns: [member.id],
      name: "calendar_item_employeeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: "calendar_item_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.timeOffId],
      foreignColumns: [timeOff.id],
      name: "calendar_item_timeOffId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const availability = sqliteTable(
  "availability",
  {
    ...commonColumns,
    memberId: text().notNull(),
    dayOfWeek: integer().notNull(),
    startTimeUtc: integer({ mode: "timestamp" }).notNull(),
    endTimeUtc: integer({ mode: "timestamp" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [member.id],
      name: "availability_memberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const booking = sqliteTable(
  "booking",
  {
    ...commonColumns,
    serviceId: text().notNull(),
    employeeId: text(),
    organizationId: text().notNull(),
    userId: text(),
    customerId: text(),
    duration: integer().notNull(),
    notes: text(),
    status: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [service.id],
      name: "booking_serviceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.employeeId],
      foreignColumns: [member.id],
      name: "booking_employeeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "booking_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "booking_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customer.id],
      name: "booking_customerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const packageItem = sqliteTable(
  "package",
  {
    ...commonColumns,
    name: text().notNull(),
    description: text(),
    sortingIndex: integer().default(-1).notNull(),
    price: real().notNull(),
    organizationId: text().notNull(),
    visible: integer({ mode: "boolean" }).default(true),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "package_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const packageService = sqliteTable(
  "package_service",
  {
    ...commonColumns,
    packageId: text().notNull(),
    serviceId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.packageId],
      foreignColumns: [packageItem.id],
      name: "package_service_packageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [service.id],
      name: "package_service_serviceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const note = sqliteTable(
  "note",
  {
    ...commonColumns,
    content: text().notNull(),
    customerId: text().notNull(),
    authorId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customer.id],
      name: "note_customerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [user.id],
      name: "note_authorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const template = sqliteTable(
  "template",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    type: text().notNull(),
    target: text().notNull(),
    subject: text(),
    body: text().notNull(),
    enabled: integer().default(1).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "template_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const session = sqliteTable(
  "session",
  {
    ...commonColumns,
    expiresAt: integer({ mode: "timestamp" }).notNull(),
    token: text().notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull(),
    activeOrganizationId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const timeOff = sqliteTable(
  "time_off",
  {
    ...commonColumns,
    memberId: text().notNull(),
    reason: text(),
    type: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [member.id],
      name: "time_off_memberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const communicationSetting = sqliteTable(
  "communication_setting",
  {
    ...commonColumns,
    organizationId: text().notNull(),
    settings: text({ mode: "json" })
      .$type<{
        smtpServer?: string;
        smtpPort?: number;
        smtpUsername?: string;
        smtpPassword?: string;
        smsProvider?: string;
        smsApiKey?: string;
        smtpEmail?: string;
      }>()
      .notNull(),
    type: text().notNull(),
    enabled: integer({ mode: "boolean" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "communication_setting_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);
