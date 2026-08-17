CREATE TABLE `posts` (
    `post_id` text PRIMARY KEY NOT NULL,
    `post_author_id` text NOT NULL,
    `post_caption` text,
    `post_location` text,
    `post_created_at` integer NOT NULL,
    FOREIGN KEY (`post_author_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `post_images` (
    `post_image_id` text PRIMARY KEY NOT NULL,
    `post_image_post_id` text NOT NULL,
    `post_image_key` text NOT NULL,
    `post_image_position` integer NOT NULL,
    FOREIGN KEY (`post_image_post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `likes` (
    `like_post_id` text NOT NULL,
    `like_user_id` text NOT NULL,
    `like_created_at` integer NOT NULL,
    PRIMARY KEY (`like_post_id`, `like_user_id`),
    FOREIGN KEY (`like_post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`like_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `bookmarks` (
    `bookmark_post_id` text NOT NULL,
    `bookmark_user_id` text NOT NULL,
    `bookmark_created_at` integer NOT NULL,
    PRIMARY KEY (`bookmark_post_id`, `bookmark_user_id`),
    FOREIGN KEY (`bookmark_post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`bookmark_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `follows` (
    `follow_follower_id` text NOT NULL,
    `follow_following_id` text NOT NULL,
    `follow_created_at` integer NOT NULL,
    PRIMARY KEY (`follow_follower_id`, `follow_following_id`),
    FOREIGN KEY (`follow_follower_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`follow_following_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `comments` (
    `comment_id` text PRIMARY KEY NOT NULL,
    `comment_post_id` text NOT NULL,
    `comment_author_id` text NOT NULL,
    `comment_text` text NOT NULL,
    `comment_created_at` integer NOT NULL,
    FOREIGN KEY (`comment_post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`comment_author_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `profiles` (
    `profile_user_id` text PRIMARY KEY NOT NULL,
    `profile_avatar_key` text,
    `profile_bio` text,
    FOREIGN KEY (`profile_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `idx_posts_created_at` ON `posts` (`post_created_at`);
CREATE INDEX `idx_posts_author_created_at` ON `posts` (`post_author_id`, `post_created_at`);

CREATE INDEX `idx_post_images_post_position` ON `post_images` (`post_image_post_id`, `post_image_position`);

CREATE INDEX `idx_likes_user_id` ON `likes` (`like_user_id`);

CREATE INDEX `idx_bookmarks_user_id` ON `bookmarks` (`bookmark_user_id`);

CREATE INDEX `idx_follows_following_id` ON `follows` (`follow_following_id`);

CREATE INDEX `idx_comments_post_created` ON `comments` (`comment_post_id`, `comment_created_at`);
CREATE INDEX `idx_comments_author_id` ON `comments` (`comment_author_id`);