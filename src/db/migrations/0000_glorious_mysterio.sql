CREATE TABLE `temp_verification_email` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text(36) NOT NULL,
	`expires_on` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `temp_verification_email_user_id_unique` ON `temp_verification_email` (`user_id`);--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'guest',
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false,
	`password` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_email_unique` ON `users_table` (`email`);