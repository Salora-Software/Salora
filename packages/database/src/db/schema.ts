import { sqliteTable, foreignKey, text, int, real, integer, blob, index, primaryKey } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"


export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
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
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const organization = sqliteTable("organization", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text(),
	logo: text(),
	createdAt: text().notNull(),
	metadata: text(),
	maxMembers: integer(),
	location: text(),
	website: text(),
	phone: text(),
	email: text(),
	timeZone: text().notNull(),
	appointmentStatus: text().default('PENDING').notNull(),
	minimumBookingTime: real().default(0.5).notNull(),
	bookingPeriod: integer().default(365).notNull(),
	autoShiftTimeSlot: integer().default(0).notNull(),
	onboardingStep: integer().default(0),
}, (table) => []);

export const openingTime = sqliteTable("opening_time", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTimeUtc: text().notNull(),
	endTimeUtc: text().notNull(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "opening_time_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: text().notNull(),
	createdAt: text(),
	updatedAt: text(),
});

export const member = sqliteTable("member", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	userId: text().notNull(),
	role: text().notNull(),
	invitationStatus: text().default('ACTIVE').notNull(),
	createdAt: text().notNull(),
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

export const customer = sqliteTable("customer", {
	id: text().primaryKey().notNull(),
	authToken: text(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	address: text(),
	organizationId: text().notNull(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: text(),
}, (table) => [
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

export const invitation = sqliteTable("invitation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
	expiresAt: text().notNull(),
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



export const user = sqliteTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: integer().notNull(),
	image: text(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
	phone: text(),
});

export const employeeService = sqliteTable("employee_service", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	serviceId: text().notNull(),
}, (table) => [
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

export const service = sqliteTable("service", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(-1).notNull(),
	duration: integer().notNull(),
	price: real().notNull(),
	organizationId: text().notNull(),
	visible: integer().default(1),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "service_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const calendarItem = sqliteTable("calendar_item", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	title: text(),
	memberId: text(),
	startTime: text().notNull(),
	endTime: text().notNull(),
	type: text().notNull(),
	notes: text(),
	bookingId: text(),
	timeOffId: text(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text().notNull(),
}, (table) => [
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

export const availability = sqliteTable("availability", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTimeUtc: text().notNull(),
	endTimeUtc: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "availability_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const booking = sqliteTable("booking", {
	id: text().primaryKey().notNull(),
	serviceId: text().notNull(),
	employeeId: text(),
	organizationId: text().notNull(),
	userId: text(),
	customerId: text(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	duration: integer().notNull(),
	notes: text(),
	status: text().notNull(),
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

export const packageItem = sqliteTable("package", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(-1).notNull(),
	price: real().notNull(),
	organizationId: text().notNull(),
	visible: integer().default(1),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "package_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const packageService = sqliteTable("package_service", {
	id: text().primaryKey().notNull(),
	packageId: text().notNull(),
	serviceId: text().notNull(),
}, (table) => [
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

export const note = sqliteTable("note", {
	id: text().primaryKey().notNull(),
	content: text().notNull(),
	customerId: text().notNull(),
	authorId: text().notNull(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text().notNull(),
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

export const template = sqliteTable("template", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	type: text().notNull(),
	target: text().notNull(),
	subject: text(),
	body: text().notNull(),
	enabled: integer().default(1).notNull(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "template_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: text().notNull(),
	token: text().notNull(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
	activeOrganizationId: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const timeOff = sqliteTable("time_off", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull(),
	reason: text(),
	type: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [member.id],
			name: "time_off_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const communicationSetting = sqliteTable("communication_setting", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	settings: text().notNull(),
	type: text().notNull(),
	enabled: integer().default(1).notNull(),
	createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "communication_setting_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);


