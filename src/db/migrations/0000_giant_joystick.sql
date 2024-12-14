CREATE TABLE `todos_table` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`done` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer
);
