CREATE TABLE `support_rate_limits` (
  `id` text PRIMARY KEY NOT NULL,
  `count` integer DEFAULT 0 NOT NULL,
  `expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_support_rate_limits_expires` ON `support_rate_limits` (`expires_at`);
