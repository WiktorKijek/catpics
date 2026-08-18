import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { keysetCursorSchema } from "#lib/cursor";
import {
	fetchPostCounts,
	hydrateFeedPosts,
	type FeedPage,
	type FeedPost,
	type FeedPostSeed,
} from "#lib/server/posts";

const PAGE_SIZE = 10;

const FeedPageInputSchema = v.object({
	cursor: v.optional(v.nullable(keysetCursorSchema)),
});

export type FeedPageInput = v.InferInput<typeof FeedPageInputSchema>;

export type { FeedPage, FeedPost } from "#lib/server/posts";

/**
 * The home feed: newest posts first with author, images, counts, comment
 * previews and the viewer's like/bookmark state. Public — a session only
 * personalizes the response.
 */
export const getFeedPage = command(FeedPageInputSchema, async (input): Promise<FeedPage> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const cursor = input.cursor ?? null;
	const viewerId = event.locals.session?.userId ?? null;

	let query = db
		.selectFrom("posts")
		.innerJoin("users", "users.userId", "posts.postAuthorId")
		.leftJoin("profiles", "profiles.profileUserId", "posts.postAuthorId")
		.select([
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
				eb("posts.postCreatedAt", "<", cursor.createdAt),
				eb.and([
					eb("posts.postCreatedAt", "=", cursor.createdAt),
					eb("posts.postId", "<", cursor.id),
				]),
			]),
		);
	}

	const rows = await query
		.orderBy("posts.postCreatedAt", "desc")
		.orderBy("posts.postId", "desc")
		.limit(PAGE_SIZE)
		.execute();

	// Counts come from two grouped queries over the page's posts instead of a
	// correlated COUNT subquery per post (see `fetchPostCounts`).
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

	const posts = await hydrateFeedPosts(db, seeds, viewerId);

	const last = posts[posts.length - 1];
	const nextCursor =
		posts.length === PAGE_SIZE && last ? { createdAt: last.createdAt, id: last.postId } : null;

	return { posts, nextCursor };
});
