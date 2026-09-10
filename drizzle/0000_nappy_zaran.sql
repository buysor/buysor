CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`daily_reward` integer DEFAULT 0 NOT NULL,
	`milestone_reward` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_user_date` ON `attendance` (`user_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `idx_attendance_user_created` ON `attendance` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`source` text NOT NULL,
	`reference_key` text NOT NULL,
	`expires_on` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_ledger_reference` ON `credit_ledger` (`reference_key`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_user_expiry` ON `credit_ledger` (`user_id`,`expires_on`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
