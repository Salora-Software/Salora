CREATE INDEX IF NOT EXISTS `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `booking_customerId_idx` ON `booking` (`customerId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `booking_organizationId_idx` ON `booking` (`organizationId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `calendar_item_organizationId_type_idx` ON `calendar_item` (`organizationId`,`type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customer_organizationId_idx` ON `customer` (`organizationId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customer_email_organizationId_idx` ON `customer` (`email`,`organizationId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customer_userId_idx` ON `customer` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `member_organizationId_userId_unique` ON `member` (`organizationId`,`userId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `note_customerId_idx` ON `note` (`customerId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `organization_slug_idx` ON `organization` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);