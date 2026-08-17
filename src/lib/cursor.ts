import * as v from "valibot";

/**
 * Keyset (seek) cursor used for stable pagination on `(createdAt, id)` pairs.
 * Each list endpoint orders by timestamp descending and breaks ties with the
 * row's primary key, so the cursor simply records where the previous page ended.
 */
export const keysetCursorSchema = v.object({
	createdAt: v.number("createdAt must be a number"),
	id: v.pipe(v.string(), v.minLength(1, "id cannot be empty")),
});

export type KeysetCursor = v.InferInput<typeof keysetCursorSchema>;

/**
 * Keyset (seek) cursor for browsing users alphabetically. Users carry no
 * creation timestamp, so the sort is `(username, userId)` in ascending order
 * and the cursor records where the previous page ended.
 */
export const usernameCursorSchema = v.object({
	username: v.pipe(v.string(), v.minLength(1, "username cannot be empty")),
	userId: v.pipe(v.string(), v.minLength(1, "userId cannot be empty")),
});

export type UsernameCursor = v.InferInput<typeof usernameCursorSchema>;
