PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_organization` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`logo` text,
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
	`autoShiftTimeSlot` integer DEFAULT false NOT NULL,
	`onboardingStep` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_organization`("id", "createdAt", "updatedAt", "name", "slug", "logo", "metadata", "maxMembers", "location", "website", "phone", "email", "timeZone", "appointmentStatus", "minimumBookingTime", "bookingPeriod", "autoShiftTimeSlot", "onboardingStep") SELECT "id", "createdAt", "updatedAt", "name", "slug", "logo", "metadata", "maxMembers", "location", "website", "phone", "email", "timeZone", "appointmentStatus", "minimumBookingTime", "bookingPeriod", "autoShiftTimeSlot", "onboardingStep" FROM `organization`;--> statement-breakpoint
DROP TABLE `organization`;--> statement-breakpoint
ALTER TABLE `__new_organization` RENAME TO `organization`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_template` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_template`("id", "createdAt", "updatedAt", "organizationId", "type", "target", "subject", "body", "enabled") SELECT "id", "createdAt", "updatedAt", "organizationId", "type", "target", "subject", "body", "enabled" FROM `template`;--> statement-breakpoint
DROP TABLE `template`;--> statement-breakpoint
ALTER TABLE `__new_template` RENAME TO `template`;