CREATE TABLE `post_streaks` (
    `post_streak_user_id` text PRIMARY KEY NOT NULL,
    `post_streak_current` integer NOT NULL DEFAULT 0,
    `post_streak_longest` integer NOT NULL DEFAULT 0,
    `post_streak_last_date` text,
    FOREIGN KEY (`post_streak_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);