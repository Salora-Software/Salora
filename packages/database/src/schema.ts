import { pgTable, foreignKey, text, timestamp, uniqueIndex, integer, doublePrecision, boolean, jsonb, index, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const bookingStatus = pgEnum("BookingStatus", ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
export const calendarItemType = pgEnum("CalendarItemType", ['AVAILABILITY', 'TIME_OFF', 'BOOKING', 'NOTE'])
export const communicationType = pgEnum("CommunicationType", ['EMAIL', 'SMS'])
export const invitationStatus = pgEnum("InvitationStatus", ['PENDING', 'ACCEPTED', 'DECLINED', 'ACTIVE'])
export const templateTarget = pgEnum("TemplateTarget", ['CUSTOMER', 'EMPLOYEE'])
export const templateType = pgEnum("TemplateType", ['EMAIL_APPROVED', 'EMAIL_DENIED', 'EMAIL_CANCELED', 'EMAIL_CREATED', 'SMS_APPROVED', 'SMS_DENIED', 'SMS_CANCELED'])
export const timeOffType = pgEnum("TimeOffType", ['LEAVE', 'SPECIAL'])


export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ precision: 3, mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ precision: 3, mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const organization = pgTable("organization", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text(),
	logo: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	metadata: text(),
	maxMembers: integer(),
	location: text(),
	website: text(),
	phone: text(),
	email: text(),
	timeZone: text().notNull(),
	appointmentStatus: bookingStatus().default('PENDING').notNull(),
	minimumBookingTime: doublePrecision().default(0.5).notNull(),
	bookingPeriod: integer().default(365).notNull(),
	autoShiftTimeSlot: boolean().default(false).notNull(),
	onboardingStep: integer().default(0),
}, (table) => [
	uniqueIndex("organization_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const openingTime = pgTable("opening_time", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTimeUtc: timestamp({ precision: 3, mode: 'string' }).notNull(),
	endTimeUtc: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("opening_time_id_key").using("btree", table.id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "opening_time_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }),
	updatedAt: timestamp({ precision: 3, mode: 'string' }),
});

export const member = pgTable("member", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	userId: text().notNull(),
	role: text().notNull(),
	invitationStatus: invitationStatus().default('ACTIVE').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "member_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "member_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const customer = pgTable("customer", {
	id: text().primaryKey().notNull(),
	authToken: text(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	address: text(),
	organizationId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: text(),
}, (table) => [
	uniqueIndex("customer_authToken_key").using("btree", table.authToken.asc().nullsLast().op("text_ops")),
	uniqueIndex("customer_email_organizationId_key").using("btree", table.email.asc().nullsLast().op("text_ops"), table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "customer_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "customer_userId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const invitation = pgTable("invitation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	inviterId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "invitation_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [user.id],
			name: "invitation_inviterId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const fingerprint = pgTable("fingerprint", {
	id: text().primaryKey().notNull(),
	fingerprintId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	lastSeenAt: timestamp({ precision: 3, mode: 'string' }),
	ipAddresses: text().array(),
	flagged: boolean().default(false).notNull(),
	trustScore: integer().default(0).notNull(),
}, (table) => [
	uniqueIndex("fingerprint_fingerprintId_key").using("btree", table.fingerprintId.asc().nullsLast().op("text_ops")),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().notNull(),
	image: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	phone: text(),
}, (table) => [
	uniqueIndex("user_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const employeeService = pgTable("employee_service", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	serviceId: text().notNull(),
}, (table) => [
	uniqueIndex("employee_service_memberId_serviceId_key").using("btree", table.memberId.asc().nullsLast().op("text_ops"), table.serviceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "employee_service_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [service.id],
			name: "employee_service_serviceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const service = pgTable("service", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(sql`'-1'`).notNull(),
	duration: integer().notNull(),
	price: doublePrecision().notNull(),
	organizationId: text().notNull(),
	visible: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "service_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const calendarItem = pgTable("calendar_item", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	title: text(),
	memberId: text(),
	startTime: timestamp({ precision: 3, mode: 'string' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'string' }).notNull(),
	type: calendarItemType().notNull(),
	notes: text(),
	bookingId: text(),
	timeOffId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("calendar_item_bookingId_key").using("btree", table.bookingId.asc().nullsLast().op("text_ops")),
	uniqueIndex("calendar_item_timeOffId_key").using("btree", table.timeOffId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "calendar_item_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "calendar_item_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [booking.id],
			name: "calendar_item_bookingId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.timeOffId],
			foreignColumns: [timeOff.id],
			name: "calendar_item_timeOffId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const availability = pgTable("availability", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTimeUtc: timestamp({ precision: 3, mode: 'string' }).notNull(),
	endTimeUtc: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "availability_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const booking = pgTable("booking", {
	id: text().primaryKey().notNull(),
	serviceId: text().notNull(),
	employeeId: text(),
	organizationId: text().notNull(),
	userId: text(),
	customerId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	duration: integer().notNull(),
	notes: text(),
	status: bookingStatus().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [service.id],
			name: "booking_serviceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [member.id],
			name: "booking_employeeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "booking_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "booking_userId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customer.id],
			name: "booking_customerId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const packageItem = pgTable("package", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(sql`'-1'`).notNull(),
	price: doublePrecision().notNull(),
	organizationId: text().notNull(),
	visible: boolean().default(true),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "package_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const packageService = pgTable("package_service", {
	id: text().primaryKey().notNull(),
	packageId: text().notNull(),
	serviceId: text().notNull(),
}, (table) => [
	uniqueIndex("package_service_packageId_serviceId_key").using("btree", table.packageId.asc().nullsLast().op("text_ops"), table.serviceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.packageId],
			foreignColumns: [packageItem.id],
			name: "package_service_packageId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [service.id],
			name: "package_service_serviceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const note = pgTable("note", {
	id: text().primaryKey().notNull(),
	content: text().notNull(),
	customerId: text().notNull(),
	authorId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customer.id],
			name: "note_customerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "note_authorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const template = pgTable("template", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	type: templateType().notNull(),
	target: templateTarget().notNull(),
	subject: text(),
	body: text().notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("template_type_target_organizationId_key").using("btree", table.type.asc().nullsLast().op("text_ops"), table.target.asc().nullsLast().op("enum_ops"), table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "template_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
	activeOrganizationId: text(),
}, (table) => [
	uniqueIndex("session_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const timeOff = pgTable("time_off", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	reason: text(),
	type: timeOffType().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "time_off_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const communicationSetting = pgTable("communication_setting", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	settings: jsonb().notNull(),
	type: communicationType().notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("communication_setting_type_organizationId_key").using("btree", table.type.asc().nullsLast().op("text_ops"), table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "communication_setting_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const fingerprintToUser = pgTable("_FingerprintToUser", {
	a: text("A").notNull(),
	b: text("B").notNull(),
}, (table) => [
	index().using("btree", table.b.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.a],
			foreignColumns: [fingerprint.id],
			name: "_FingerprintToUser_A_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.b],
			foreignColumns: [user.id],
			name: "_FingerprintToUser_B_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.a, table.b], name: "_FingerprintToUser_AB_pkey"}),
]);
