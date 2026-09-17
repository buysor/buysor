CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `state_text` text DEFAULT '' NOT NULL,
  `structured_state_json` text,
  `survey_json` text DEFAULT '{}' NOT NULL,
  `category_profiles_json` text DEFAULT '{}' NOT NULL,
  `completion` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `decisions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `input_type` text NOT NULL,
  `input_label` text NOT NULL,
  `input_json` text NOT NULL,
  `answers_json` text NOT NULL,
  `result_json` text,
  `verdict` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `category_id` text,
  `subcategory_id` text,
  `recheck_at` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `idx_decisions_user_created` ON `decisions` (`user_id`,`created_at`);
CREATE INDEX IF NOT EXISTS `idx_decisions_user_status` ON `decisions` (`user_id`,`status`);
CREATE INDEX IF NOT EXISTS `idx_decisions_user_recheck` ON `decisions` (`user_id`,`recheck_at`);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `user_id` text PRIMARY KEY NOT NULL,
  `tier` text DEFAULT 'essential' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `provider` text,
  `provider_customer_id` text,
  `provider_subscription_id` text,
  `current_period_end` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `purchase_feedback` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `decision_id` text NOT NULL,
  `stage` text NOT NULL,
  `rating` integer,
  `would_choose_again` integer,
  `note` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`decision_id`) REFERENCES `decisions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_purchase_feedback_decision_stage` ON `purchase_feedback` (`decision_id`,`stage`);
CREATE INDEX IF NOT EXISTS `idx_purchase_feedback_user_created` ON `purchase_feedback` (`user_id`,`created_at`);
