CREATE TABLE `daily_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`raw_content` text NOT NULL,
	`duplicate_hash` text NOT NULL,
	`summary` text,
	`biggest_signal` text,
	`model_recommendation` text,
	`needs_review` integer NOT NULL,
	`warnings` text NOT NULL,
	`parser_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_briefs_duplicate_hash_unique` ON `daily_briefs` (`duplicate_hash`);--> statement-breakpoint
CREATE INDEX `brief_date_idx` ON `daily_briefs` (`date`);--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`domain` text,
	`category` text,
	`facts` text,
	`analysis` text,
	`recommendation` text,
	`impact` text NOT NULL,
	`raw_section` text NOT NULL,
	`needs_review` integer NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `daily_briefs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_brief_idx` ON `news_items` (`brief_id`);--> statement-breakpoint
CREATE INDEX `item_filter_idx` ON `news_items` (`domain`,`category`,`impact`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`url` text NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `news_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_item_idx` ON `sources` (`item_id`);