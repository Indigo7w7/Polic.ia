-- Migración manual para habilitar el sistema de logros
CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`points_reward` int NOT NULL DEFAULT 0,
	`category` enum('EXAM','LEITNER','STREAK','SOCIAL','GENERAL') DEFAULT 'GENERAL',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_code_unique` UNIQUE(`code`)
);

CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`achievement_Id` int,
	`unlocked_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);

ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievement_Id_achievements_id_fk` FOREIGN KEY (`achievement_Id`) REFERENCES `achievements`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `idx_user_ach` ON `user_achievements` (`user_id`,`achievement_Id`);
