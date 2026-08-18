import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import {
	fetchPostCounts,
	hydrateFeedPosts,
	type FeedPost,
	type FeedPostSeed,
} from "#lib/server/posts";

const GetPostSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
});

export type GetPostInput = v.InferInput<typeof GetPostSchema>;

export type PostDetail = FeedPost;

/**
 * A single post with all of its images, comment previews, counts and the
 * viewer's like/bookmark state — the same shape the feed and bookmarks list
 * use, so the feed's post component renders it unchanged. Public — a session
 * only personalizes the response.
 */
export const getPost = command(GetPostSchema, async (input): Promise<FeedPost> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const viewerId = event.locals.session?.userId ?? null;

	const post = await db
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
		])
		.where("posts.postId", "=", input.postId)
		.executeTakeFirst();

	if (!post) {
		error(404, "Post not found");
	}

	const { likeCounts, commentCounts } = await fetchPostCounts(db, [post.postId]);
	const seeds: FeedPostSeed[] = [
		{
			postId: post.postId,
			postCaption: post.postCaption,
			postLocation: post.postLocation,
			postCreatedAt: post.postCreatedAt,
			postAuthorId: post.postAuthorId,
			authorUsername: post.authorUsername,
			authorAvatarKey: post.authorAvatarKey,
			likeCount: likeCounts.get(post.postId) ?? 0,
			commentCount: commentCounts.get(post.postId) ?? 0,
		},
	];

	const [hydrated] = await hydrateFeedPosts(db, seeds, viewerId);
	return hydrated;
});
