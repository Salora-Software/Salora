import { sqliteTable, AnySQLiteColumn, foreignKey, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const employeeService = sqliteTable("employee_service", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull().references(() => member.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	serviceId: text().notNull().references(() => service.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const packageService = sqliteTable("package_service", {
	id: text().primaryKey().notNull(),
	packageId: text().notNull().references(() => package.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	serviceId: text().notNull().references(() => service.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const timeOff = sqliteTable("time_off", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull().references(() => member.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	reason: text(),
	type: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const availability = sqliteTable("availability", {
	id: text().primaryKey().notNull(),
	memberId: text().notNull().references(() => member.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dayOfWeek: integer().notNull(),
	startTimeUtc: integer().notNull(),
	endTimeUtc: integer().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const service = sqliteTable("service", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(-1).notNull(),
	duration: integer().notNull(),
	price: real().notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	visible: integer().default(true),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const invitation = sqliteTable("invitation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
	expiresAt: integer().notNull(),
	inviterId: text().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: text(),
	refreshTokenExpiresAt: text(),
	scope: text(),
	password: text(),
});

export const member = sqliteTable("member", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	role: text().notNull(),
	invitationStatus: text().default("ACTIVE").notNull(),
});

export const organization = sqliteTable("organization", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
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
	autoShiftTimeSlot: integer().default(0).notNull(),
	onboardingStep: integer().default(0),
});

export const user = sqliteTable("user", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: integer().notNull(),
	image: text(),
	phone: text(),
});

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer().notNull(),
});

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	expiresAt: integer().notNull(),
	token: text().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	activeOrganizationId: text(),
});

export const calendarItem = sqliteTable("calendar_item", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text(),
	employeeId: text().references(() => member.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	startTime: integer().notNull(),
	endTime: integer().notNull(),
	type: text().notNull(),
	notes: text(),
	bookingId: text().references(() => booking.id, { onDelete: "set null", onUpdate: "cascade" } ),
	timeOffId: text().references(() => timeOff.id, { onDelete: "set null", onUpdate: "cascade" } ),
});

export const booking = sqliteTable("booking", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	serviceId: text().notNull().references(() => service.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	employeeId: text().references(() => member.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: text().references(() => user.id, { onDelete: "set null", onUpdate: "cascade" } ),
	customerId: text().references(() => customer.id, { onDelete: "set null", onUpdate: "cascade" } ),
	duration: integer().notNull(),
	notes: text(),
	status: text().notNull(),
});

export const communicationSetting = sqliteTable("communication_setting", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	settings: text().notNull(),
	type: text().notNull(),
	enabled: integer().notNull(),
},
(table) => [
	uniqueIndex("communication_setting_org_type_idx").on(table.organizationId, table.type),
]);

export const customer = sqliteTable("customer", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	authToken: text(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	address: text(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: text().references(() => user.id, { onDelete: "set null", onUpdate: "cascade" } ),
});

export const note = sqliteTable("note", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	content: text().notNull(),
	customerId: text().notNull().references(() => customer.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	authorId: text().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
});

export const openingTime = sqliteTable("opening_time", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dayOfWeek: integer().notNull(),
	startTimeUtc: integer().notNull(),
	endTimeUtc: integer().notNull(),
});

export const package = sqliteTable("package", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	name: text().notNull(),
	description: text(),
	sortingIndex: integer().default(-1).notNull(),
	price: real().notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	visible: integer().default(true),
});

export const template = sqliteTable("template", {
	id: text().primaryKey().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
	organizationId: text().notNull().references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	type: text().notNull(),
	target: text().notNull(),
	subject: text(),
	body: text().notNull(),
	enabled: integer().default(1).notNull(),
});

