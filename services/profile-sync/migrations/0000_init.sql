CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`rounds` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_profile_external_uq` ON `courses` (`profile_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `courses_profile_idx` ON `courses` (`profile_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`external_id` text NOT NULL,
	`course_id` text NOT NULL,
	`date` text NOT NULL,
	`final_note` text,
	`final_score` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_profile_external_uq` ON `games` (`profile_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `games_profile_idx` ON `games` (`profile_id`);--> statement-breakpoint
CREATE INDEX `games_course_idx` ON `games` (`course_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`dob_hash` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`external_id` text NOT NULL,
	`game_id` text NOT NULL,
	`hole` integer NOT NULL,
	`par` text NOT NULL,
	`score` text NOT NULL,
	`putts` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_profile_external_uq` ON `scores` (`profile_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `scores_profile_idx` ON `scores` (`profile_id`);--> statement-breakpoint
CREATE INDEX `scores_game_idx` ON `scores` (`game_id`);