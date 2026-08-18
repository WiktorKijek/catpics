import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { keysetCursorSchema } from "#lib/cursor";
import { requireSession } from "#lib/server/auth";
import {
	fetchPostCounts,
	hydrateFeedPosts,
	type FeedPage,
	type FeedPost,
	type FeedPostSeed,
} from "#lib/server/posts";

const PAGE_SIZE = 10;

const ListBookmarksSchema = v.object({
	cursor: v.optional(v.nullable(keysetCursorSchema)),
});

export type ListBookmarksInput = v.InferInput<typeof ListBookmarksSchema>;

export type { FeedPage, FeedPost } from "#lib/server/posts";

/**
 * The viewer's saved posts, most recently bookmarked first. Personal data, so a
 * session is required; `bookmarkedByMe` is always true.
 */
export const listBookmarks = command(ListBookmarksSchema, async (input): Promise<FeedPage> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;
	const cursor = input.cursor ?? null;

	let query = db
		.selectFrom("bookmarks")
		.innerJoin("posts", "posts.postId", "bookmarks.bookmarkPostId")
		.innerJoin("users", "users.userId", "posts.postAuthorId")
		.leftJoin("profiles", "profiles.profileUserId", "posts.postAuthorId")
		.select([
			"bookmarks.bookmarkCreatedAt",
			"posts.postId",
			"posts.postCaption",
			"posts.postLocation",
			"posts.postCreatedAt",
			"posts.postAuthorId",
			"users.userUsername as authorUsername",
			"profiles.profileAvatarKey as authorAvatarKey",
		]);

	if (cursor) {
		query = query.where((eb) =>
			eb.or([
				eb("bookmarks.bookmarkCreatedAt", "<", cursor.createdAt),
				eb.and([
					eb("bookmarks.bookmarkCreatedAt", "=", cursor.createdAt),
					eb("bookmarks.bookmarkPostId", "<", cursor.id),
				]),
			]),
		);
	}

	const rows = await query
		.orderBy("bookmarks.bookmarkCreatedAt", "desc")
		.orderBy("bookmarks.bookmarkPostId", "desc")
		.limit(PAGE_SIZE)
		.execute();

	const { likeCounts, commentCounts } = await fetchPostCounts(
		db,
		rows.map((row) => row.postId),
	);
	const seeds: FeedPostSeed[] = rows.map((row) => ({
		postId: row.postId,
		postCaption: row.postCaption,
		postLocation: row.postLocation,
		postCreatedAt: row.postCreatedAt,
		postAuthorId: row.postAuthorId,
		authorUsername: row.authorUsername,
		authorAvatarKey: row.authorAvatarKey,
		likeCount: likeCounts.get(row.postId) ?? 0,
		commentCount: commentCounts.get(row.postId) ?? 0,
	}));

	const posts = await hydrateFeedPosts(db, seeds, session.userId);

	// The cursor seeks on bookmark time, not post time, so derive it from the
	// raw rows rather than the hydrated posts.
	const last = rows[rows.length - 1];
	const nextCursor =
		rows.length === PAGE_SIZE && last
			? { createdAt: last.bookmarkCreatedAt, id: last.postId }
			: null;

	return { posts, nextCursor };
});
