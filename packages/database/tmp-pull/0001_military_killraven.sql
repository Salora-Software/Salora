PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `__new_employee_service` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `memberId` text NOT NULL,
    `serviceId` text NOT NULL,
    FOREIGN KEY (`memberId`) REFERENCES `member` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`serviceId`) REFERENCES `service` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_employee_service` (
        "id",
        "createdAt",
        "updatedAt",
        "memberId",
        "serviceId"
    )
SELECT "id", "createdAt", "updatedAt", "memberId", "serviceId"
FROM `employee_service`;
--> statement-breakpoint
DROP TABLE `employee_service`;
--> statement-breakpoint
ALTER TABLE `__new_employee_service` RENAME TO `employee_service`;
--> statement-breakpoint
CREATE TABLE `__new_package_service` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `packageId` text NOT NULL,
    `serviceId` text NOT NULL,
    FOREIGN KEY (`packageId`) REFERENCES `package` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`serviceId`) REFERENCES `service` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_package_service` (
        "id",
        "createdAt",
        "updatedAt",
        "packageId",
        "serviceId"
    )
SELECT "id", "createdAt", "updatedAt", "packageId", "serviceId"
FROM `package_service`;
--> statement-breakpoint
DROP TABLE `package_service`;
--> statement-breakpoint
ALTER TABLE `__new_package_service` RENAME TO `package_service`;
--> statement-breakpoint
CREATE TABLE `__new_time_off` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `memberId` text NOT NULL,
    `reason` text,
    `type` text NOT NULL,
    FOREIGN KEY (`memberId`) REFERENCES `member` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_time_off` (
        "id",
        "createdAt",
        "updatedAt",
        "memberId",
        "reason",
        "type"
    )
SELECT "id", "createdAt", "updatedAt", "memberId", "reason", "type"
FROM `time_off`;
--> statement-breakpoint
DROP TABLE `time_off`;
--> statement-breakpoint
ALTER TABLE `__new_time_off` RENAME TO `time_off`;
--> statement-breakpoint
CREATE TABLE `__new_availability` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `memberId` text NOT NULL,
    `dayOfWeek` integer NOT NULL,
    `startTimeUtc` integer NOT NULL,
    `endTimeUtc` integer NOT NULL,
    FOREIGN KEY (`memberId`) REFERENCES `member` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_availability` (
        "id",
        "createdAt",
        "updatedAt",
        "memberId",
        "dayOfWeek",
        "startTimeUtc",
        "endTimeUtc"
    )
SELECT "id", "createdAt", "updatedAt", "memberId", "dayOfWeek", "startTimeUtc", "endTimeUtc"
FROM `availability`;
--> statement-breakpoint
DROP TABLE `availability`;
--> statement-breakpoint
ALTER TABLE `__new_availability` RENAME TO `availability`;
--> statement-breakpoint
CREATE TABLE `__new_service` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `name` text NOT NULL,
    `description` text,
    `sortingIndex` integer DEFAULT -1 NOT NULL,
    `duration` integer NOT NULL,
    `price` real NOT NULL,
    `organizationId` text NOT NULL,
    `visible` integer DEFAULT true,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_service` (
        "id",
        "createdAt",
        "updatedAt",
        "name",
        "description",
        "sortingIndex",
        "duration",
        "price",
        "organizationId",
        "visible"
    )
SELECT "id", "createdAt", "updatedAt", "name", "description", "sortingIndex", "duration", "price", "organizationId", "visible"
FROM `service`;
--> statement-breakpoint
DROP TABLE `service`;
--> statement-breakpoint
ALTER TABLE `__new_service` RENAME TO `service`;
--> statement-breakpoint
CREATE TABLE `__new_invitation` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `email` text NOT NULL,
    `role` text,
    `status` text NOT NULL,
    `expiresAt` integer NOT NULL,
    `inviterId` text NOT NULL,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`inviterId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_invitation` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "email",
        "role",
        "status",
        "expiresAt",
        "inviterId"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "email", "role", "status", "expiresAt", "inviterId"
FROM `invitation`;
--> statement-breakpoint
DROP TABLE `invitation`;
--> statement-breakpoint
ALTER TABLE `__new_invitation` RENAME TO `invitation`;
--> statement-breakpoint
CREATE TABLE `__new_account` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
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
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_account` (
        "id",
        "createdAt",
        "updatedAt",
        "accountId",
        "providerId",
        "userId",
        "accessToken",
        "refreshToken",
        "idToken",
        "accessTokenExpiresAt",
        "refreshTokenExpiresAt",
        "scope",
        "password"
    )
SELECT "id", "createdAt", "updatedAt", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password"
FROM `account`;
--> statement-breakpoint
DROP TABLE `account`;
--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;
--> statement-breakpoint
CREATE TABLE `__new_member` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `userId` text NOT NULL,
    `role` text NOT NULL,
    `invitationStatus` text DEFAULT 'ACTIVE' NOT NULL,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_member` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "userId",
        "role",
        "invitationStatus"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "userId", "role", "invitationStatus"
FROM `member`;
--> statement-breakpoint
DROP TABLE `member`;
--> statement-breakpoint
ALTER TABLE `__new_member` RENAME TO `member`;
--> statement-breakpoint
CREATE TABLE `__new_session` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `expiresAt` integer NOT NULL,
    `token` text NOT NULL,
    `ipAddress` text,
    `userAgent` text,
    `userId` text NOT NULL,
    `activeOrganizationId` text,
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_session` (
        "id",
        "createdAt",
        "updatedAt",
        "expiresAt",
        "token",
        "ipAddress",
        "userAgent",
        "userId",
        "activeOrganizationId"
    )
SELECT "id", "createdAt", "updatedAt", "expiresAt", "token", "ipAddress", "userAgent", "userId", "activeOrganizationId"
FROM `session`;
--> statement-breakpoint
DROP TABLE `session`;
--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;
--> statement-breakpoint
CREATE TABLE `__new_calendar_item` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `title` text,
    `employeeId` text,
    `startTime` integer NOT NULL,
    `endTime` integer NOT NULL,
    `type` text NOT NULL,
    `notes` text,
    `bookingId` text,
    `timeOffId` text,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`employeeId`) REFERENCES `member` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`bookingId`) REFERENCES `booking` (`id`) ON UPDATE cascade ON DELETE set null,
    FOREIGN KEY (`timeOffId`) REFERENCES `time_off` (`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO
    `__new_calendar_item` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "title",
        "employeeId",
        "startTime",
        "endTime",
        "type",
        "notes",
        "bookingId",
        "timeOffId"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "title", "employeeId", "startTime", "endTime", "type", "notes", "bookingId", "timeOffId"
FROM `calendar_item`;
--> statement-breakpoint
DROP TABLE `calendar_item`;
--> statement-breakpoint
ALTER TABLE `__new_calendar_item` RENAME TO `calendar_item`;
--> statement-breakpoint
CREATE TABLE `__new_booking` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `serviceId` text NOT NULL,
    `employeeId` text,
    `organizationId` text NOT NULL,
    `userId` text,
    `customerId` text,
    `duration` integer NOT NULL,
    `notes` text,
    `status` text NOT NULL,
    FOREIGN KEY (`serviceId`) REFERENCES `service` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`employeeId`) REFERENCES `member` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE set null,
    FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO
    `__new_booking` (
        "id",
        "createdAt",
        "updatedAt",
        "serviceId",
        "employeeId",
        "organizationId",
        "userId",
        "customerId",
        "duration",
        "notes",
        "status"
    )
SELECT "id", "createdAt", "updatedAt", "serviceId", "employeeId", "organizationId", "userId", "customerId", "duration", "notes", "status"
FROM `booking`;
--> statement-breakpoint
DROP TABLE `booking`;
--> statement-breakpoint
ALTER TABLE `__new_booking` RENAME TO `booking`;
--> statement-breakpoint
CREATE TABLE `__new_communication_setting` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `settings` text NOT NULL,
    `type` text NOT NULL,
    `enabled` integer NOT NULL,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_communication_setting` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "settings",
        "type",
        "enabled"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "settings", "type", "enabled"
FROM `communication_setting`;
--> statement-breakpoint
DROP TABLE `communication_setting`;
--> statement-breakpoint
ALTER TABLE `__new_communication_setting`
RENAME TO `communication_setting`;
--> statement-breakpoint
CREATE UNIQUE INDEX `communication_setting_org_type_idx` ON `communication_setting` (`organizationId`, `type`);
--> statement-breakpoint
CREATE TABLE `__new_customer` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `authToken` text,
    `name` text NOT NULL,
    `email` text NOT NULL,
    `phone` text,
    `address` text,
    `organizationId` text NOT NULL,
    `userId` text,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO
    `__new_customer` (
        "id",
        "createdAt",
        "updatedAt",
        "authToken",
        "name",
        "email",
        "phone",
        "address",
        "organizationId",
        "userId"
    )
SELECT "id", "createdAt", "updatedAt", "authToken", "name", "email", "phone", "address", "organizationId", "userId"
FROM `customer`;
--> statement-breakpoint
DROP TABLE `customer`;
--> statement-breakpoint
ALTER TABLE `__new_customer` RENAME TO `customer`;
--> statement-breakpoint
CREATE TABLE `__new_note` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `content` text NOT NULL,
    `customerId` text NOT NULL,
    `authorId` text NOT NULL,
    FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON UPDATE cascade ON DELETE cascade,
    FOREIGN KEY (`authorId`) REFERENCES `user` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_note` (
        "id",
        "createdAt",
        "updatedAt",
        "content",
        "customerId",
        "authorId"
    )
SELECT "id", "createdAt", "updatedAt", "content", "customerId", "authorId"
FROM `note`;
--> statement-breakpoint
DROP TABLE `note`;
--> statement-breakpoint
ALTER TABLE `__new_note` RENAME TO `note`;
--> statement-breakpoint
CREATE TABLE `__new_opening_time` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `dayOfWeek` integer NOT NULL,
    `startTimeUtc` integer NOT NULL,
    `endTimeUtc` integer NOT NULL,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_opening_time` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "dayOfWeek",
        "startTimeUtc",
        "endTimeUtc"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "dayOfWeek", "startTimeUtc", "endTimeUtc"
FROM `opening_time`;
--> statement-breakpoint
DROP TABLE `opening_time`;
--> statement-breakpoint
ALTER TABLE `__new_opening_time` RENAME TO `opening_time`;
--> statement-breakpoint
CREATE TABLE `__new_package` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `name` text NOT NULL,
    `description` text,
    `sortingIndex` integer DEFAULT -1 NOT NULL,
    `price` real NOT NULL,
    `organizationId` text NOT NULL,
    `visible` integer DEFAULT true,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_package` (
        "id",
        "createdAt",
        "updatedAt",
        "name",
        "description",
        "sortingIndex",
        "price",
        "organizationId",
        "visible"
    )
SELECT "id", "createdAt", "updatedAt", "name", "description", "sortingIndex", "price", "organizationId", "visible"
FROM `package`;
--> statement-breakpoint
DROP TABLE `package`;
--> statement-breakpoint
ALTER TABLE `__new_package` RENAME TO `package`;
--> statement-breakpoint
CREATE TABLE `__new_template` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `organizationId` text NOT NULL,
    `type` text NOT NULL,
    `target` text NOT NULL,
    `subject` text,
    `body` text NOT NULL,
    `enabled` integer DEFAULT true NOT NULL,
    FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO
    `__new_template` (
        "id",
        "createdAt",
        "updatedAt",
        "organizationId",
        "type",
        "target",
        "subject",
        "body",
        "enabled"
    )
SELECT "id", "createdAt", "updatedAt", "organizationId", "type", "target", "subject", "body", "enabled"
FROM `template`;
--> statement-breakpoint
DROP TABLE `template`;
--> statement-breakpoint
ALTER TABLE `__new_template` RENAME TO `template`;
--> statement-breakpoint
CREATE TABLE `__new_organization` (
    `id` text PRIMARY KEY NOT NULL,
    `createdAt` integer DEFAULT(unixepoch ()) NOT NULL,
    `updatedAt` integer DEFAULT(unixepoch ()) NOT NULL,
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
    `onboardingStep` integer DEFAULT 0,
    `requiredBookingFields` text
);
--> statement-breakpoint
INSERT INTO
    `__new_organization` (
        "id",
        "createdAt",
        "updatedAt",
        "name",
        "slug",
        "logo",
        "metadata",
        "maxMembers",
        "location",
        "website",
        "phone",
        "email",
        "timeZone",
        "appointmentStatus",
        "minimumBookingTime",
        "bookingPeriod",
        "autoShiftTimeSlot",
        "onboardingStep",
        "requiredBookingFields"
    )
SELECT
    "id",
    "createdAt",
    "updatedAt",
    "name",
    "slug",
    "logo",
    "metadata",
    "maxMembers",
    "location",
    "website",
    "phone",
    "email",
    "timeZone",
    "appointmentStatus",
    "minimumBookingTime",
    "bookingPeriod",
    "autoShiftTimeSlot",
    "onboardingStep",
    "requiredBookingFields"
FROM `organization`;
--> statement-breakpoint
DROP TABLE `organization`;
--> statement-breakpoint
ALTER TABLE `__new_organization` RENAME TO `organization`;