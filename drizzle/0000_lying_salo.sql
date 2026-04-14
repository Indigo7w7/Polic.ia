CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_id` varchar(255),
	`action` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attempt_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int,
	`question_id` int,
	`chosen_option` int NOT NULL,
	`is_correct` boolean NOT NULL,
	CONSTRAINT `attempt_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('INFO','WARNING','EVENT') NOT NULL DEFAULT 'WARNING',
	`is_active` boolean NOT NULL DEFAULT true,
	`active_until` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `broadcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_fsrs_map` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int,
	`question_id` int,
	`question_index` int,
	`deck_tag` varchar(255),
	CONSTRAINT `content_fsrs_map_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('PDF','VIDEO','EXAM','LINK','TEXT') NOT NULL,
	`content_url` varchar(512),
	`order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnail_url` varchar(512),
	`level` enum('BASICO','INTERMEDIO','AVANZADO') DEFAULT 'BASICO',
	`school_type` enum('EO','EESTP','BOTH') DEFAULT 'BOTH',
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`score` int NOT NULL,
	`passed` boolean DEFAULT false,
	`started_at` timestamp DEFAULT (now()),
	`ended_at` timestamp,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exam_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`url` varchar(512) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `exam_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`exam_level_id` int,
	`is_practice_mode` boolean DEFAULT false,
	`is_muerte_subita` boolean DEFAULT false,
	`questions` json,
	`answers` json,
	`flagged_questions` json,
	`time_spent_per_question` json,
	`time_left` int DEFAULT 1800,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exam_id` int,
	`area_id` int,
	`question` text NOT NULL,
	`options` json NOT NULL,
	`correct_option` int NOT NULL,
	`difficulty` enum('EASY','MEDIUM','HARD') DEFAULT 'MEDIUM',
	`school_type` enum('EO','EESTP','BOTH') DEFAULT 'BOTH',
	CONSTRAINT `exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school` enum('EO','EESTP') NOT NULL,
	`level` int NOT NULL,
	`title` varchar(255),
	`is_demo` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `failed_drills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`unit_id` int,
	`question_index` int NOT NULL,
	`attempts` int DEFAULT 1,
	`last_failed_at` timestamp DEFAULT (now()),
	CONSTRAINT `failed_drills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `global_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('INFO','WARNING','EVENT') NOT NULL DEFAULT 'WARNING',
	`is_active` boolean NOT NULL DEFAULT true,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `global_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`sender_id` varchar(255),
	`sender_name` varchar(255),
	`message` text NOT NULL,
	`is_question` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `interview_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_a_id` varchar(255),
	`user_b_id` varchar(255),
	`user_a_name` varchar(255),
	`user_b_name` varchar(255),
	`status` enum('waiting','active','phase2','rating','done') NOT NULL DEFAULT 'waiting',
	`phase` int NOT NULL DEFAULT 1,
	`a_question_count` int NOT NULL DEFAULT 0,
	`b_question_count` int NOT NULL DEFAULT 0,
	`score_a_to_b` float,
	`score_b_to_a` float,
	`is_practice` boolean NOT NULL DEFAULT false,
	`current_turn_status` enum('questioning','awaiting_solicit','responding','awaiting_finish') NOT NULL DEFAULT 'questioning',
	`current_interviewer_id` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `interview_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(50),
	CONSTRAINT `learning_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area_id` int,
	`topic` varchar(255) NOT NULL DEFAULT 'GENERAL',
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`questions` json,
	`level` int DEFAULT 1,
	`order_in_topic` int DEFAULT 0,
	`school_type` enum('EO','EESTP','BOTH') DEFAULT 'BOTH',
	CONSTRAINT `learning_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`unit_id` int,
	`score` int DEFAULT 0,
	`completed_at` timestamp DEFAULT (now()),
	CONSTRAINT `learning_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leitner_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`question_id` int,
	`learning_content_id` int,
	`question_index` int,
	`stability` float NOT NULL DEFAULT 0.1,
	`difficulty` float NOT NULL DEFAULT 5,
	`state` enum('new','learning','review','relearning') NOT NULL DEFAULT 'new',
	`reps` int NOT NULL DEFAULT 0,
	`lapses` int NOT NULL DEFAULT 0,
	`scheduled_days` int NOT NULL DEFAULT 0,
	`elapsed_days` int NOT NULL DEFAULT 0,
	`queue` int NOT NULL DEFAULT 0,
	`previous_queue` int,
	`next_review` timestamp,
	`last_review` timestamp,
	`level` int DEFAULT 0,
	`deck_tag` varchar(255),
	`mod` bigint NOT NULL DEFAULT 0,
	`usn` int NOT NULL DEFAULT 0,
	CONSTRAINT `leitner_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int,
	`user_id` varchar(255),
	`ease` int NOT NULL,
	`scheduled_days` int NOT NULL,
	`elapsed_days` int NOT NULL,
	`stability_before` float,
	`stability_after` float,
	`difficulty_before` float,
	`difficulty_after` float,
	`state_before` enum('new','learning','review','relearning'),
	`state_after` enum('new','learning','review','relearning'),
	`reviewed_at` timestamp DEFAULT (now()),
	`time_taken` int,
	CONSTRAINT `review_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_subscriptions` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255),
	`status` varchar(50),
	`price_id` varchar(255),
	`current_period_end` timestamp,
	CONSTRAINT `stripe_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uid` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`photo_url` varchar(512),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`school` enum('EO','EESTP'),
	`membership` enum('FREE','PRO') NOT NULL DEFAULT 'FREE',
	`status` enum('ACTIVE','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
	`premium_expiration` timestamp,
	`last_active` timestamp DEFAULT (now()),
	`age` int,
	`city` varchar(100),
	`profile_edited` boolean NOT NULL DEFAULT false,
	`honor_points` int NOT NULL DEFAULT 0,
	`merit_points` int NOT NULL DEFAULT 0,
	`current_streak` int NOT NULL DEFAULT 0,
	`last_streak_update` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_uid` PRIMARY KEY(`uid`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `yape_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`voucher_url` varchar(512) NOT NULL,
	`status` enum('PENDIENTE','APROBADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
	`amount` int DEFAULT 15,
	`school` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `yape_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_admin_id_users_uid_fk` FOREIGN KEY (`admin_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD CONSTRAINT `attempt_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD CONSTRAINT `attempt_answers_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_fsrs_map` ADD CONSTRAINT `content_fsrs_map_content_id_learning_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `learning_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_fsrs_map` ADD CONSTRAINT `content_fsrs_map_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_materials` ADD CONSTRAINT `course_materials_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_materials` ADD CONSTRAINT `exam_materials_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_progress` ADD CONSTRAINT `exam_progress_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_area_id_learning_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `learning_areas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_drills` ADD CONSTRAINT `failed_drills_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_drills` ADD CONSTRAINT `failed_drills_unit_id_learning_content_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `learning_content`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_content` ADD CONSTRAINT `learning_content_area_id_learning_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `learning_areas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_progress` ADD CONSTRAINT `learning_progress_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_progress` ADD CONSTRAINT `learning_progress_unit_id_learning_content_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `learning_content`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leitner_cards` ADD CONSTRAINT `leitner_cards_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leitner_cards` ADD CONSTRAINT `leitner_cards_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leitner_cards` ADD CONSTRAINT `leitner_cards_learning_content_id_learning_content_id_fk` FOREIGN KEY (`learning_content_id`) REFERENCES `learning_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_logs` ADD CONSTRAINT `review_logs_card_id_leitner_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `leitner_cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_logs` ADD CONSTRAINT `review_logs_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stripe_subscriptions` ADD CONSTRAINT `stripe_subscriptions_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `yape_audits` ADD CONSTRAINT `yape_audits_user_id_users_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_logs_admin` ON `admin_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_logs_created` ON `admin_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_answers_attempt` ON `attempt_answers` (`attempt_id`);--> statement-breakpoint
CREATE INDEX `idx_answers_question` ON `attempt_answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_broadcasts_active` ON `broadcasts` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_broadcasts_until` ON `broadcasts` (`active_until`);--> statement-breakpoint
CREATE INDEX `idx_map_content` ON `content_fsrs_map` (`content_id`);--> statement-breakpoint
CREATE INDEX `idx_map_question` ON `content_fsrs_map` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_materials_course` ON `course_materials` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_courses_school` ON `courses` (`school_type`);--> statement-breakpoint
CREATE INDEX `idx_courses_level` ON `courses` (`level`);--> statement-breakpoint
CREATE INDEX `idx_attempts_user` ON `exam_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attempts_started` ON `exam_attempts` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_exam_materials_exam` ON `exam_materials` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_progress_user` ON `exam_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_exam` ON `exam_questions` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_area` ON `exam_questions` (`area_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_difficulty` ON `exam_questions` (`difficulty`);--> statement-breakpoint
CREATE INDEX `idx_questions_school` ON `exam_questions` (`school_type`);--> statement-breakpoint
CREATE INDEX `idx_exams_school` ON `exams` (`school`);--> statement-breakpoint
CREATE INDEX `idx_exams_level` ON `exams` (`level`);--> statement-breakpoint
CREATE INDEX `idx_failed_user_unit` ON `failed_drills` (`user_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_failed_last_date` ON `failed_drills` (`last_failed_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_active` ON `global_notifications` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_interview_msg_session` ON `interview_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_interview_status` ON `interview_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_interview_user_a` ON `interview_sessions` (`user_a_id`);--> statement-breakpoint
CREATE INDEX `idx_interview_user_b` ON `interview_sessions` (`user_b_id`);--> statement-breakpoint
CREATE INDEX `idx_interview_turn` ON `interview_sessions` (`current_turn_status`);--> statement-breakpoint
CREATE INDEX `idx_content_area` ON `learning_content` (`area_id`);--> statement-breakpoint
CREATE INDEX `idx_content_school` ON `learning_content` (`school_type`);--> statement-breakpoint
CREATE INDEX `idx_content_topic` ON `learning_content` (`topic`);--> statement-breakpoint
CREATE INDEX `idx_progress_user` ON `learning_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_progress_unit` ON `learning_progress` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_leitner_user` ON `leitner_cards` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_leitner_question` ON `leitner_cards` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_leitner_review` ON `leitner_cards` (`next_review`);--> statement-breakpoint
CREATE INDEX `idx_leitner_state` ON `leitner_cards` (`state`);--> statement-breakpoint
CREATE INDEX `idx_leitner_queue` ON `leitner_cards` (`queue`);--> statement-breakpoint
CREATE INDEX `idx_leitner_tag` ON `leitner_cards` (`deck_tag`);--> statement-breakpoint
CREATE INDEX `idx_leitner_mod` ON `leitner_cards` (`mod`);--> statement-breakpoint
CREATE INDEX `idx_revlog_card` ON `review_logs` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_revlog_user` ON `review_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_revlog_date` ON `review_logs` (`reviewed_at`);--> statement-breakpoint
CREATE INDEX `idx_stripe_user` ON `stripe_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_users_membership` ON `users` (`membership`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_last_active` ON `users` (`last_active`);--> statement-breakpoint
CREATE INDEX `idx_yape_user` ON `yape_audits` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_yape_status` ON `yape_audits` (`status`);