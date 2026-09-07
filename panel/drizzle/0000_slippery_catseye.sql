CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`step` integer NOT NULL,
	`agent_id` text NOT NULL,
	`agent_name` text NOT NULL,
	`phase` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_project_step` ON `messages` (`project_id`,`step`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`brief` text NOT NULL,
	`team` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`output` text DEFAULT '' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
