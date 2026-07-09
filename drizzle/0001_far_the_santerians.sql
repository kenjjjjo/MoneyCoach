CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`budgetAmount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coach_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`memo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`totalSpend` int NOT NULL DEFAULT 0,
	`budgetAmount` int NOT NULL DEFAULT 0,
	`score` int NOT NULL DEFAULT 0,
	`grade` varchar(1) NOT NULL DEFAULT 'C',
	`topCategory` varchar(64),
	`summary` text,
	`goodPoints` text,
	`warningPoints` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`budgetAlert` boolean NOT NULL DEFAULT true,
	`budgetAlertThreshold` int NOT NULL DEFAULT 80,
	`weeklyReport` boolean NOT NULL DEFAULT true,
	`monthlyReport` boolean NOT NULL DEFAULT true,
	`dailyReminder` boolean NOT NULL DEFAULT false,
	`notificationTime` varchar(5) NOT NULL DEFAULT '21:00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekKey` varchar(10) NOT NULL,
	`totalSpend` int NOT NULL DEFAULT 0,
	`prevWeekTotal` int NOT NULL DEFAULT 0,
	`topCategory` varchar(64),
	`summary` text,
	`goodPoints` text,
	`warningPoints` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
