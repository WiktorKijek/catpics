import { command, getRequestEvent } from "$app/server";
import { sql, type SqlBool } from "kysely";
import * as v from "valibot";
import { usernameCursorSchema, type UsernameCursor } from "#lib/cursor";

const PAGE_SIZE = 30;

const ListUsersSchema = v.object({
	search: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(32, "Search term is too long"))),
	cursor: v.optional(v.nullable(usernameCursorSchema)),
});

export type ListUsersInput = v.InferInput<typeof ListUsersSchema>;

export type UserSummary = {
	userId: string;
	username: string;
	avatarKey: string | null;
	followerCount: number;
	followedByMe: boolean;
};

export type UsersPage = {
	users: UserSummary[];
	nextCursor: UsernameCursor | null;
};

/**
 * Browse registered users, alphabetically by username, optionally filtered by a
 * search substring, and paginated with a username keyset cursor. Public — a
 * session only personalizes `followedByMe`.
 */
export const listUsers = command(ListUsersSchema, async (input): Promise<UsersPage> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const viewerId = event.locals.session?.userId ?? null;
	const cursor = input.cursor ?? null;

	let query = db
		.selectFrom("users")
		.leftJoin("profiles", "profiles.profileUserId", "users.userId")
		.select((eb) => [
			"users.userId",
			"users.userUsername",
			"profiles.profileAvatarKey",
			eb
				.selectFrom("follows")
				.select(db.fn.countAll().as("count"))
				.whereRef("followFollowingId", "=", "users.userId")
				.as("followerCount"),
		]);

	if (input.search) {
		// Escape LIKE wildcards so the search term is matched literally.
		const escaped = input.search.replace(/[\\%_]/g, (char) => `\\${char}`);
		query = query.where(sql<SqlBool>`users.user_username LIKE ${`%${escaped}%`} ESCAPE '\\'`);
	}

	if (cursor) {
		query = query.where((eb) =>
			eb.or([
				eb("users.userUsername", ">", cursor.username),
				eb.and([
					eb("users.userUsername", "=", cursor.username),
					eb("users.userId", ">", cursor.userId),
				]),
			]),
		);
	}

	const rows = await query
		.orderBy("users.userUsername", "asc")
		.orderBy("users.userId", "asc")
		.limit(PAGE_SIZE)
		.execute();

	const followedIds = new Set<string>();
	if (viewerId) {
		const follows = await db
			.selectFrom("follows")
			.select("followFollowingId")
			.where("followFollowerId", "=", viewerId)
			.execute();
		for (const follow of follows) followedIds.add(follow.followFollowingId);
	}

	const users: UserSummary[] = rows.map((row) => ({
		userId: row.userId,
		username: row.userUsername,
		avatarKey: row.profileAvatarKey,
		followerCount: Number(row.followerCount),
		followedByMe: followedIds.has(row.userId),
	}));

	const last = users[users.length - 1];
	const nextCursor =
		users.length === PAGE_SIZE && last
			? { username: last.username, userId: last.userId }
			: null;

	return { users, nextCursor };
});
