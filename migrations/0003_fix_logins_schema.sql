-- Earlier development databases carried a `login_username` column on
-- `logins` (a leftover from a schema where the username lived there instead
-- of `users.user_username`). The current code only writes
-- `login_user_id` and `login_password_hash`, so on those databases the insert
-- fails with `NOT NULL constraint failed: logins.login_username` and
-- registration dies with a 500.
--
-- Rebuild the table without that column. The rebuild is deliberately written
-- to be safe on fresh databases as well (where the column doesn't exist), so
-- it can be applied to every environment.

CREATE TABLE `logins_new` (
    `login_user_id` text PRIMARY KEY NOT NULL,
    `login_password_hash` text NOT NULL,
    FOREIGN KEY (`login_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO `logins_new` (`login_user_id`, `login_password_hash`)
    SELECT `login_user_id`, `login_password_hash` FROM `logins`;

DROP TABLE `logins`;

ALTER TABLE `logins_new` RENAME TO `logins`;

CREATE INDEX `idx_logins_user_id` ON `logins` (`login_user_id`);