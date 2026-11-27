import { relations } from "drizzle-orm/relations";
import { service, employeeService, member, packageService, package, timeOff, availability, organization, user, invitation, account, session, calendarItem, booking, customer, communicationSetting, note, openingTime, template } from "./schema";

export const employeeServiceRelations = relations(employeeService, ({one}) => ({
	service: one(service, {
		fields: [employeeService.serviceId],
		references: [service.id]
	}),
	member: one(member, {
		fields: [employeeService.memberId],
		references: [member.id]
	}),
}));

export const serviceRelations = relations(service, ({one, many}) => ({
	employeeServices: many(employeeService),
	packageServices: many(packageService),
	organization: one(organization, {
		fields: [service.organizationId],
		references: [organization.id]
	}),
	bookings: many(booking),
}));

export const memberRelations = relations(member, ({one, many}) => ({
	employeeServices: many(employeeService),
	timeOffs: many(timeOff),
	availabilities: many(availability),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	calendarItems: many(calendarItem),
	bookings: many(booking),
}));

export const packageServiceRelations = relations(packageService, ({one}) => ({
	service: one(service, {
		fields: [packageService.serviceId],
		references: [service.id]
	}),
	package: one(package, {
		fields: [packageService.packageId],
		references: [package.id]
	}),
}));

export const packageRelations = relations(package, ({one, many}) => ({
	packageServices: many(packageService),
	organization: one(organization, {
		fields: [package.organizationId],
		references: [organization.id]
	}),
}));

export const timeOffRelations = relations(timeOff, ({one, many}) => ({
	member: one(member, {
		fields: [timeOff.memberId],
		references: [member.id]
	}),
	calendarItems: many(calendarItem),
}));

export const availabilityRelations = relations(availability, ({one}) => ({
	member: one(member, {
		fields: [availability.memberId],
		references: [member.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	services: many(service),
	invitations: many(invitation),
	members: many(member),
	calendarItems: many(calendarItem),
	bookings: many(booking),
	communicationSettings: many(communicationSetting),
	customers: many(customer),
	openingTimes: many(openingTime),
	packages: many(package),
	templates: many(template),
}));

export const invitationRelations = relations(invitation, ({one}) => ({
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	invitations: many(invitation),
	accounts: many(account),
	members: many(member),
	sessions: many(session),
	bookings: many(booking),
	customers: many(customer),
	notes: many(note),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const calendarItemRelations = relations(calendarItem, ({one}) => ({
	timeOff: one(timeOff, {
		fields: [calendarItem.timeOffId],
		references: [timeOff.id]
	}),
	booking: one(booking, {
		fields: [calendarItem.bookingId],
		references: [booking.id]
	}),
	member: one(member, {
		fields: [calendarItem.employeeId],
		references: [member.id]
	}),
	organization: one(organization, {
		fields: [calendarItem.organizationId],
		references: [organization.id]
	}),
}));

export const bookingRelations = relations(booking, ({one, many}) => ({
	calendarItems: many(calendarItem),
	customer: one(customer, {
		fields: [booking.customerId],
		references: [customer.id]
	}),
	user: one(user, {
		fields: [booking.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [booking.organizationId],
		references: [organization.id]
	}),
	member: one(member, {
		fields: [booking.employeeId],
		references: [member.id]
	}),
	service: one(service, {
		fields: [booking.serviceId],
		references: [service.id]
	}),
}));

export const customerRelations = relations(customer, ({one, many}) => ({
	bookings: many(booking),
	user: one(user, {
		fields: [customer.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [customer.organizationId],
		references: [organization.id]
	}),
	notes: many(note),
}));

export const communicationSettingRelations = relations(communicationSetting, ({one}) => ({
	organization: one(organization, {
		fields: [communicationSetting.organizationId],
		references: [organization.id]
	}),
}));

export const noteRelations = relations(note, ({one}) => ({
	user: one(user, {
		fields: [note.authorId],
		references: [user.id]
	}),
	customer: one(customer, {
		fields: [note.customerId],
		references: [customer.id]
	}),
}));

export const openingTimeRelations = relations(openingTime, ({one}) => ({
	organization: one(organization, {
		fields: [openingTime.organizationId],
		references: [organization.id]
	}),
}));

export const templateRelations = relations(template, ({one}) => ({
	organization: one(organization, {
		fields: [template.organizationId],
		references: [organization.id]
	}),
}));