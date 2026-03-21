import { relations } from "drizzle-orm/relations";
import { user, account, organization, openingTime, member, customer, invitation, employeeService, service, calendarItem, booking, timeOff, availability, packageItem, packageService, note, template, session, communicationSetting, fingerprint, fingerprintToUser } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	members: many(member),
	customers: many(customer),
	invitations: many(invitation),
	bookings: many(booking),
	notes: many(note),
	sessions: many(session),
	fingerprintToUsers: many(fingerprintToUser),
}));

export const openingTimeRelations = relations(openingTime, ({one}) => ({
	organization: one(organization, {
		fields: [openingTime.organizationId],
		references: [organization.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	openingTimes: many(openingTime),
	members: many(member),
	customers: many(customer),
	invitations: many(invitation),
	services: many(service),
	calendarItems: many(calendarItem),
	bookings: many(booking),
	packages: many(packageItem),
	templates: many(template),
	communicationSettings: many(communicationSetting),
}));

export const memberRelations = relations(member, ({one, many}) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	}),
	employeeServices: many(employeeService),
	calendarItems: many(calendarItem),
	availabilities: many(availability),
	bookings: many(booking),
	timeOffs: many(timeOff),
}));

export const customerRelations = relations(customer, ({one, many}) => ({
	organization: one(organization, {
		fields: [customer.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [customer.userId],
		references: [user.id]
	}),
	bookings: many(booking),
	notes: many(note),
}));

export const invitationRelations = relations(invitation, ({one}) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	}),
}));

export const employeeServiceRelations = relations(employeeService, ({one}) => ({
	member: one(member, {
		fields: [employeeService.memberId],
		references: [member.id]
	}),
	service: one(service, {
		fields: [employeeService.serviceId],
		references: [service.id]
	}),
}));

export const serviceRelations = relations(service, ({one, many}) => ({
	employeeServices: many(employeeService),
	organization: one(organization, {
		fields: [service.organizationId],
		references: [organization.id]
	}),
	bookings: many(booking),
	packageServices: many(packageService),
}));

export const calendarItemRelations = relations(calendarItem, ({one}) => ({
	organization: one(organization, {
		fields: [calendarItem.organizationId],
		references: [organization.id]
	}),
	member: one(member, {
		fields: [calendarItem.memberId],
		references: [member.id]
	}),
	booking: one(booking, {
		fields: [calendarItem.bookingId],
		references: [booking.id]
	}),
	timeOff: one(timeOff, {
		fields: [calendarItem.timeOffId],
		references: [timeOff.id]
	}),
}));

export const bookingRelations = relations(booking, ({one, many}) => ({
	calendarItems: many(calendarItem),
	service: one(service, {
		fields: [booking.serviceId],
		references: [service.id]
	}),
	member: one(member, {
		fields: [booking.employeeId],
		references: [member.id]
	}),
	organization: one(organization, {
		fields: [booking.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [booking.userId],
		references: [user.id]
	}),
	customer: one(customer, {
		fields: [booking.customerId],
		references: [customer.id]
	}),
}));

export const timeOffRelations = relations(timeOff, ({one, many}) => ({
	calendarItems: many(calendarItem),
	member: one(member, {
		fields: [timeOff.memberId],
		references: [member.id]
	}),
}));

export const availabilityRelations = relations(availability, ({one}) => ({
	member: one(member, {
		fields: [availability.memberId],
		references: [member.id]
	}),
}));

export const packageRelations = relations(packageItem, ({one, many}) => ({
	organization: one(organization, {
		fields: [packageItem.organizationId],
		references: [organization.id]
	}),
	packageServices: many(packageService),
}));

export const packageServiceRelations = relations(packageService, ({one}) => ({
	package: one(packageItem, {
		fields: [packageService.packageId],
		references: [packageItem.id]
	}),
	service: one(service, {
		fields: [packageService.serviceId],
		references: [service.id]
	}),
}));

export const noteRelations = relations(note, ({one}) => ({
	customer: one(customer, {
		fields: [note.customerId],
		references: [customer.id]
	}),
	user: one(user, {
		fields: [note.authorId],
		references: [user.id]
	}),
}));

export const templateRelations = relations(template, ({one}) => ({
	organization: one(organization, {
		fields: [template.organizationId],
		references: [organization.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const communicationSettingRelations = relations(communicationSetting, ({one}) => ({
	organization: one(organization, {
		fields: [communicationSetting.organizationId],
		references: [organization.id]
	}),
}));

export const fingerprintToUserRelations = relations(fingerprintToUser, ({one}) => ({
	fingerprint: one(fingerprint, {
		fields: [fingerprintToUser.a],
		references: [fingerprint.id]
	}),
	user: one(user, {
		fields: [fingerprintToUser.b],
		references: [user.id]
	}),
}));

export const fingerprintRelations = relations(fingerprint, ({many}) => ({
	fingerprintToUsers: many(fingerprintToUser),
}));