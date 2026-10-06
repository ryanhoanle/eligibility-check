CREATE TABLE `eligibility_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`service_date` text NOT NULL,
	`status` text NOT NULL,
	`result_json` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`attempts` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `checks_patient_created_idx` ON `eligibility_checks` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `checks_status_idx` ON `eligibility_checks` (`status`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`dob` text NOT NULL,
	`payer_id` text NOT NULL,
	`member_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `patients_last_name_idx` ON `patients` (`last_name`);