import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { keysetCursorSchema } from "#lib/cursor";
import { hydrateFeedPosts, type FeedPage, type FeedPost } from "#lib/server/posts";

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
		.select((eb) => [
			"posts.postId",
			"posts.postCaption",
			"posts.postLocation",
			"posts.postCreatedAt",
			"posts.postAuthorId",
			"users.userUsername as authorUsername",
			"profiles.profileAvatarKey as authorAvatarKey",
			eb
				.selectFrom("likes")
				.select(db.fn.countAll().as("count"))
				.whereRef("likePostId", "=", "posts.postId")
				.as("likeCount"),
			eb
				.selectFrom("comments")
				.select(db.fn.countAll().as("count"))
				.whereRef("commentPostId", "=", "posts.postId")
				.as("commentCount"),
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

	const posts = await hydrateFeedPosts(db, rows, viewerId);

	const last = posts[posts.length - 1];
	const nextCursor =
		posts.length === PAGE_SIZE && last ? { createdAt: last.createdAt, id: last.postId } : null;

	return { posts, nextCursor };
});
