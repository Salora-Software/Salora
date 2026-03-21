-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."BookingStatus" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."CalendarItemType" AS ENUM('AVAILABILITY', 'TIME_OFF', 'BOOKING', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."CommunicationType" AS ENUM('EMAIL', 'SMS');--> statement-breakpoint
CREATE TYPE "public"."InvitationStatus" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."TemplateTarget" AS ENUM('CUSTOMER', 'EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."TemplateType" AS ENUM('EMAIL_APPROVED', 'EMAIL_DENIED', 'EMAIL_CANCELED', 'EMAIL_CREATED', 'SMS_APPROVED', 'SMS_DENIED', 'SMS_CANCELED');--> statement-breakpoint
CREATE TYPE "public"."TimeOffType" AS ENUM('LEAVE', 'SPECIAL');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp(3),
	"refreshTokenExpiresAt" timestamp(3),
	"scope" text,
	"password" text,
	"createdAt" timestamp(3) NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"createdAt" timestamp(3) NOT NULL,
	"metadata" text,
	"maxMembers" integer,
	"location" text,
	"website" text,
	"phone" text,
	"email" text,
	"timeZone" text NOT NULL,
	"appointmentStatus" "BookingStatus" DEFAULT 'PENDING' NOT NULL,
	"minimumBookingTime" double precision DEFAULT 0.5 NOT NULL,
	"bookingPeriod" integer DEFAULT 365 NOT NULL,
	"autoShiftTimeSlot" boolean DEFAULT false NOT NULL,
	"onboardingStep" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "opening_time" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTimeUtc" timestamp(3) NOT NULL,
	"endTimeUtc" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3),
	"updatedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"invitationStatus" "InvitationStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"authToken" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"organizationId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"inviterId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fingerprint" (
	"id" text PRIMARY KEY NOT NULL,
	"fingerprintId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"lastSeenAt" timestamp(3),
	"ipAddresses" text[],
	"flagged" boolean DEFAULT false NOT NULL,
	"trustScore" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp(3) NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "employee_service" (
	"id" text PRIMARY KEY NOT NULL,
	"memberId" text NOT NULL,
	"serviceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sortingIndex" integer DEFAULT '-1' NOT NULL,
	"duration" integer NOT NULL,
	"price" double precision NOT NULL,
	"organizationId" text NOT NULL,
	"visible" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "calendar_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"title" text,
	"memberId" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"type" "CalendarItemType" NOT NULL,
	"notes" text,
	"bookingId" text,
	"timeOffId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" text PRIMARY KEY NOT NULL,
	"memberId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTimeUtc" timestamp(3) NOT NULL,
	"endTimeUtc" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" text PRIMARY KEY NOT NULL,
	"serviceId" text NOT NULL,
	"employeeId" text,
	"organizationId" text NOT NULL,
	"userId" text,
	"customerId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"duration" integer NOT NULL,
	"notes" text,
	"status" "BookingStatus" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sortingIndex" integer DEFAULT '-1' NOT NULL,
	"price" double precision NOT NULL,
	"organizationId" text NOT NULL,
	"visible" boolean DEFAULT true,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_service" (
	"id" text PRIMARY KEY NOT NULL,
	"packageId" text NOT NULL,
	"serviceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"customerId" text NOT NULL,
	"authorId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"type" "TemplateType" NOT NULL,
	"target" "TemplateTarget" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp(3) NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"activeOrganizationId" text
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" text PRIMARY KEY NOT NULL,
	"memberId" text NOT NULL,
	"reason" text,
	"type" "TimeOffType" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"settings" jsonb NOT NULL,
	"type" "CommunicationType" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_FingerprintToUser" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_FingerprintToUser_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "opening_time" ADD CONSTRAINT "opening_time_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_service" ADD CONSTRAINT "employee_service_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_service" ADD CONSTRAINT "employee_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar_item" ADD CONSTRAINT "calendar_item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar_item" ADD CONSTRAINT "calendar_item_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar_item" ADD CONSTRAINT "calendar_item_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."booking"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar_item" ADD CONSTRAINT "calendar_item_timeOffId_fkey" FOREIGN KEY ("timeOffId") REFERENCES "public"."time_off"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "package" ADD CONSTRAINT "package_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "package_service" ADD CONSTRAINT "package_service_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."package"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "package_service" ADD CONSTRAINT "package_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "communication_setting" ADD CONSTRAINT "communication_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_FingerprintToUser" ADD CONSTRAINT "_FingerprintToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."fingerprint"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_FingerprintToUser" ADD CONSTRAINT "_FingerprintToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_key" ON "organization" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "opening_time_id_key" ON "opening_time" USING btree ("id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "customer_authToken_key" ON "customer" USING btree ("authToken" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "customer_email_organizationId_key" ON "customer" USING btree ("email" text_ops,"organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "fingerprint_fingerprintId_key" ON "fingerprint" USING btree ("fingerprintId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "employee_service_memberId_serviceId_key" ON "employee_service" USING btree ("memberId" text_ops,"serviceId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_item_bookingId_key" ON "calendar_item" USING btree ("bookingId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_item_timeOffId_key" ON "calendar_item" USING btree ("timeOffId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "package_service_packageId_serviceId_key" ON "package_service" USING btree ("packageId" text_ops,"serviceId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "template_type_target_organizationId_key" ON "template" USING btree ("type" text_ops,"target" enum_ops,"organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "communication_setting_type_organizationId_key" ON "communication_setting" USING btree ("type" text_ops,"organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "_FingerprintToUser_B_index" ON "_FingerprintToUser" USING btree ("B" text_ops);
*/