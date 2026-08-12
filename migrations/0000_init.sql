CREATE TABLE `users` (
    `id` text PRIMARY KEY NOT NULL,
    `username` text NOT NULL,
    `is_admin` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `logins` (
    `user_id` text PRIMARY KEY NOT NULL,
    `login` text NOT NULL UNIQUE,
    `password_hash` text NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `sessions` (
    `id` text PRIMARY KEY NOT NULL,
    `secret_hash` text NOT NULL,
    `created_at` integer NOT NULL,
    `user_id` text NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);
CREATE INDEX `idx_logins_user_id` ON `logins` (`user_id`);
CREATE INDEX `idx_users_is_admin` ON `users` (`is_admin`);