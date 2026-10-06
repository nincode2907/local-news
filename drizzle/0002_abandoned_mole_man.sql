DROP INDEX `source_item_idx`;
--> statement-breakpoint
CREATE TABLE `__new_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`url` text,
	`label` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `news_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sources` (`id`, `item_id`, `url`, `label`)
SELECT `id`, `item_id`, `url`, `label` FROM `sources`;
--> statement-breakpoint
DROP TABLE `sources`;
--> statement-breakpoint
ALTER TABLE `__new_sources` RENAME TO `sources`;
--> statement-breakpoint
CREATE INDEX `source_item_idx` ON `sources` (`item_id`);
