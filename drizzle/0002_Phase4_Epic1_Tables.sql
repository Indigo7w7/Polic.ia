CREATE TABLE IF NOT EXISTS `police_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`difficulty` enum('EASY','MEDIUM','HARD') NOT NULL DEFAULT 'MEDIUM',
	`category` varchar(150) DEFAULT 'General',
	`initial_event` text NOT NULL,
	`system_prompt_evaluator` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `police_scenarios_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `scenario_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`scenario_id` int,
	`score` int DEFAULT 0,
	`is_passed` boolean DEFAULT false,
	`status` enum('IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
	`feedback` text,
	`chat_history` json,
	`created_at` timestamp DEFAULT (now()),
	`ended_at` timestamp,
	CONSTRAINT `scenario_attempts_id` PRIMARY KEY(`id`)
);

ALTER TABLE `scenario_attempts` ADD CONSTRAINT `scenario_attempts_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `scenario_attempts` ADD CONSTRAINT `scenario_attempts_scenario_id_police_scenarios_id_fk` FOREIGN KEY (`scenario_id`) REFERENCES `police_scenarios`(`id`) ON DELETE cascade ON UPDATE no action;
CREATE INDEX `idx_scenario_user` ON `scenario_attempts` (`user_id`);
CREATE INDEX `idx_scenario_id` ON `scenario_attempts` (`scenario_id`);