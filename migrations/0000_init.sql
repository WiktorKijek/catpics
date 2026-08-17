CREATE TABLE `users` (
    `user_id` text PRIMARY KEY NOT NULL,
    `user_username` text NOT NULL UNIQUE,
    `user_is_admin` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `logins` (
    `login_user_id` text PRIMARY KEY NOT NULL,
    `login_password_hash` text NOT NULL,
    FOREIGN KEY (`login_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `sessions` (
    `session_id` text PRIMARY KEY NOT NULL,
    `session_secret_hash` text NOT NULL,
    `session_created_at` integer NOT NULL,
    `session_user_id` text NOT NULL,
    FOREIGN KEY (`session_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `idx_sessions_user_id` ON `sessions` (`session_user_id`);
CREATE INDEX `idx_logins_user_id` ON `logins` (`login_user_id`);
CREATE INDEX `idx_users_is_admin` ON `users` (`user_is_admin`);