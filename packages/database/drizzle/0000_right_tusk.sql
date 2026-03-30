CREATE TABLE `account` (
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
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `availability` (
	`id` text PRIMARY KEY NOT NULL,
	`memberId` text NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`startTimeUtc` text NOT NULL,
	`endTimeUtc` text NOT NULL,
	FOREIGN KEY (`memberId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking` (
	`id` text PRIMARY KEY NOT NULL,
	`serviceId` text NOT NULL,
	`employeeId` text,
	`organizationId` text NOT NULL,
	`userId` text,
	`customerId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
CREATE TABLE `calendar_item` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`title` text,
	`memberId` text,
	`startTime` text NOT NULL,
	`endTime` text NOT NULL,
	`type` text NOT NULL,
	`notes` text,
	`bookingId` text,
	`timeOffId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`memberId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`bookingId`) REFERENCES `booking`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`timeOffId`) REFERENCES `time_off`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `communication_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`settings` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`authToken` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address` text,
	`organizationId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`userId` text,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `employee_service` (
	`id` text PRIMARY KEY NOT NULL,
	`memberId` text NOT NULL,
	`serviceId` text NOT NULL,
	FOREIGN KEY (`memberId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fingerprint` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprintId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`lastSeenAt` text,
	`ipAddresses` text,
	`flagged` integer DEFAULT 0 NOT NULL,
	`trustScore` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `_FingerprintToUser` (
	`A` text NOT NULL,
	`B` text NOT NULL,
	PRIMARY KEY(`A`, `B`),
	FOREIGN KEY (`A`) REFERENCES `fingerprint`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`B`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text NOT NULL,
	`expiresAt` text NOT NULL,
	`inviterId` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`inviterId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text NOT NULL,
	`invitationStatus` text DEFAULT 'ACTIVE' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `note` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`customerId` text NOT NULL,
	`authorId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `opening_time` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`startTimeUtc` text NOT NULL,
	`endTimeUtc` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`logo` text,
	`createdAt` text NOT NULL,
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
CREATE TABLE `package` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sortingIndex` integer DEFAULT -1 NOT NULL,
	`price` real NOT NULL,
	`organizationId` text NOT NULL,
	`visible` integer DEFAULT 1,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `package_service` (
	`id` text PRIMARY KEY NOT NULL,
	`packageId` text NOT NULL,
	`serviceId` text NOT NULL,
	FOREIGN KEY (`packageId`) REFERENCES `package`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sortingIndex` integer DEFAULT -1 NOT NULL,
	`duration` integer NOT NULL,
	`price` real NOT NULL,
	`organizationId` text NOT NULL,
	`visible` integer DEFAULT 1,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`activeOrganizationId` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `time_off` (
	`id` text PRIMARY KEY NOT NULL,
	`memberId` text NOT NULL,
	`reason` text,
	`type` text NOT NULL,
	FOREIGN KEY (`memberId`) REFERENCES `member`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`phone` text
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text,
	`updatedAt` text
);
