PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_calendar_item` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`title` text,
	`employeeId` text,
	`startTime` integer NOT NULL,
	`endTime` integer NOT NULL,
	`type` text NOT NULL,
	`notes` text,
	`bookingId` text,
	`timeOffId` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`employeeId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`bookingId`) REFERENCES `booking`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`timeOffId`) REFERENCES `time_off`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_calendar_item`("id", "organizationId", "title", "employeeId", "startTime", "endTime", "type", "notes", "bookingId", "timeOffId", "createdAt", "updatedAt") SELECT "id", "organizationId", "title", "employeeId", "startTime", "endTime", "type", "notes", "bookingId", "timeOffId", "createdAt", "updatedAt" FROM `calendar_item`;--> statement-breakpoint
DROP TABLE `calendar_item`;--> statement-breakpoint
ALTER TABLE `__new_calendar_item` RENAME TO `calendar_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` text,
	`refreshTokenExpiresAt` text,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt") SELECT "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
CREATE TABLE `__new_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`memberId` text NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`startTimeUtc` integer NOT NULL,
	`endTimeUtc` integer NOT NULL,
	FOREIGN KEY (`memberId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_availability`("id", "memberId", "dayOfWeek", "startTimeUtc", "endTimeUtc") SELECT "id", "memberId", "dayOfWeek", "startTimeUtc", "endTimeUtc" FROM `availability`;--> statement-breakpoint
DROP TABLE `availability`;--> statement-breakpoint
ALTER TABLE `__new_availability` RENAME TO `availability`;--> statement-breakpoint
CREATE TABLE `__new_booking` (
	`id` text PRIMARY KEY NOT NULL,
	`serviceId` text NOT NULL,
	`employeeId` text,
	`organizationId` text NOT NULL,
	`userId` text,
	`customerId` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`duration` integer NOT NULL,
	`notes` text,
	`status` text NOT NULL,
	FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`employeeId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_booking`("id", "serviceId", "employeeId", "organizationId", "userId", "customerId", "createdAt", "duration", "notes", "status") SELECT "id", "serviceId", "employeeId", "organizationId", "userId", "customerId", "createdAt", "duration", "notes", "status" FROM `booking`;--> statement-breakpoint
DROP TABLE `booking`;--> statement-breakpoint
ALTER TABLE `__new_booking` RENAME TO `booking`;--> statement-breakpoint
CREATE TABLE `__new_communication_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`settings` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_communication_setting`("id", "organizationId", "settings", "type", "enabled", "createdAt", "updatedAt") SELECT "id", "organizationId", "settings", "type", "enabled", "createdAt", "updatedAt" FROM `communication_setting`;--> statement-breakpoint
DROP TABLE `communication_setting`;--> statement-breakpoint
ALTER TABLE `__new_communication_setting` RENAME TO `communication_setting`;--> statement-breakpoint
CREATE TABLE `__new_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`authToken` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address` text,
	`organizationId` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`userId` text,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_customer`("id", "authToken", "name", "email", "phone", "address", "organizationId", "createdAt", "userId") SELECT "id", "authToken", "name", "email", "phone", "address", "organizationId", "createdAt", "userId" FROM `customer`;--> statement-breakpoint
DROP TABLE `customer`;--> statement-breakpoint
ALTER TABLE `__new_customer` RENAME TO `customer`;--> statement-breakpoint
CREATE TABLE `__new_member` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text NOT NULL,
	`invitationStatus` text DEFAULT 'ACTIVE' NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_member`("id", "organizationId", "userId", "role", "invitationStatus", "createdAt") SELECT "id", "organizationId", "userId", "role", "invitationStatus", "createdAt" FROM `member`;--> statement-breakpoint
DROP TABLE `member`;--> statement-breakpoint
ALTER TABLE `__new_member` RENAME TO `member`;--> statement-breakpoint
CREATE TABLE `__new_note` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`customerId` text NOT NULL,
	`authorId` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_note`("id", "content", "customerId", "authorId", "createdAt", "updatedAt") SELECT "id", "content", "customerId", "authorId", "createdAt", "updatedAt" FROM `note`;--> statement-breakpoint
DROP TABLE `note`;--> statement-breakpoint
ALTER TABLE `__new_note` RENAME TO `note`;--> statement-breakpoint
CREATE TABLE `__new_opening_time` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`startTimeUtc` integer NOT NULL,
	`endTimeUtc` integer NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_opening_time`("id", "organizationId", "dayOfWeek", "startTimeUtc", "endTimeUtc", "createdAt") SELECT "id", "organizationId", "dayOfWeek", "startTimeUtc", "endTimeUtc", "createdAt" FROM `opening_time`;--> statement-breakpoint
DROP TABLE `opening_time`;--> statement-breakpoint
ALTER TABLE `__new_opening_time` RENAME TO `opening_time`;--> statement-breakpoint
CREATE TABLE `__new_organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`logo` text,
	`createdAt` integer NOT NULL,
	`metadata` text,
	`maxMembers` integer,
	`location` text,
	`website` text,
	`phone` text,
	`email` text,
	`timeZone` text NOT NULL,
	`appointmentStatus` text DEFAULT 'PENDING' NOT NULL,
	`minimumBookingTime` real DEFAULT 0.5 NOT NULL,
	`bookingPeriod` integer DEFAULT 365 NOT NULL,
	`autoShiftTimeSlot` integer DEFAULT 0 NOT NULL,
	`onboardingStep` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_organization`("id", "name", "slug", "logo", "createdAt", "metadata", "maxMembers", "location", "website", "phone", "email", "timeZone", "appointmentStatus", "minimumBookingTime", "bookingPeriod", "autoShiftTimeSlot", "onboardingStep") SELECT "id", "name", "slug", "logo", "createdAt", "metadata", "maxMembers", "location", "website", "phone", "email", "timeZone", "appointmentStatus", "minimumBookingTime", "bookingPeriod", "autoShiftTimeSlot", "onboardingStep" FROM `organization`;--> statement-breakpoint
DROP TABLE `organization`;--> statement-breakpoint
ALTER TABLE `__new_organization` RENAME TO `organization`;--> statement-breakpoint
CREATE TABLE `__new_package` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sortingIndex` integer DEFAULT -1 NOT NULL,
	`price` real NOT NULL,
	`organizationId` text NOT NULL,
	`visible` integer DEFAULT true,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_package`("id", "name", "description", "sortingIndex", "price", "organizationId", "visible", "createdAt", "updatedAt") SELECT "id", "name", "description", "sortingIndex", "price", "organizationId", "visible", "createdAt", "updatedAt" FROM `package`;--> statement-breakpoint
DROP TABLE `package`;--> statement-breakpoint
ALTER TABLE `__new_package` RENAME TO `package`;--> statement-breakpoint
CREATE TABLE `__new_service` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sortingIndex` integer DEFAULT -1 NOT NULL,
	`duration` integer NOT NULL,
	`price` real NOT NULL,
	`organizationId` text NOT NULL,
	`visible` integer DEFAULT true,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_service`("id", "name", "description", "sortingIndex", "duration", "price", "organizationId", "visible") SELECT "id", "name", "description", "sortingIndex", "duration", "price", "organizationId", "visible" FROM `service`;--> statement-breakpoint
DROP TABLE `service`;--> statement-breakpoint
ALTER TABLE `__new_service` RENAME TO `service`;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`activeOrganizationId` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId") SELECT "id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE TABLE `__new_template` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_template`("id", "organizationId", "type", "target", "subject", "body", "enabled", "createdAt", "updatedAt") SELECT "id", "organizationId", "type", "target", "subject", "body", "enabled", "createdAt", "updatedAt" FROM `template`;--> statement-breakpoint
DROP TABLE `template`;--> statement-breakpoint
ALTER TABLE `__new_template` RENAME TO `template`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`phone` text
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "phone") SELECT "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "phone" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `__new_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
INSERT INTO `__new_verification`("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt") SELECT "id", "identifier", "value", "expiresAt", "createdAt", "updatedAt" FROM `verification`;--> statement-breakpoint
DROP TABLE `verification`;--> statement-breakpoint
ALTER TABLE `__new_verification` RENAME TO `verification`;