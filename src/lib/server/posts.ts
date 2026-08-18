import { error } from "@sveltejs/kit";
import type { KeysetCursor } from "#lib/cursor";
import type { Database } from "#lib/server/db";

// ---------------------------------------------------------------------------
// Shared shapes for read endpoints (feed, post detail, bookmarks).
// ---------------------------------------------------------------------------

export type PostAuthor = {
	userId: string;
	username: string;
	avatarKey: string | null;
};

export type FeedComment = {
	commentId: string;
	authorUsername: string;
	text: string;
};

export type FeedPost = {
	postId: string;
	author: PostAuthor;
	location: string | null;
	caption: string | null;
	imageKeys: string[];
	likeCount: number;
	commentCount: number;
	likedByMe: boolean;
	bookmarkedByMe: boolean;
	comments: FeedComment[];
	createdAt: number;
};

/**
 * A flattened post row as selected by feed/bookmark list queries. Every list
 * query that wants hydrated posts must select at least these columns, then pass
 * the rows to `hydrateFeedPosts` which attaches the heavier, per-post data
 * (images, comment previews, viewer state) with a handful of batched queries.
 */
export type FeedPostSeed = {
	postId: string;
	postCaption: string | null;
	postLocation: string | null;
	postCreatedAt: number;
	postAuthorId: string;
	authorUsername: string;
	authorAvatarKey: string | null;
	likeCount: number | string | bigint | null;
	commentCount: number | string | bigint | null;
};

/** How many of the most recent comments each post carries as a preview. */
export const FEED_COMMENT_PREVIEWS = 2;

export type FeedPage = {
	posts: FeedPost[];
	nextCursor: KeysetCursor | null;
};

/**
 * Attaches images, comment previews and the viewer's like/bookmark state to a
 * page of post rows. Runs at most four batched queries regardless of page size.
 */
export async function hydrateFeedPosts(
	db: Database,
	seeds: FeedPostSeed[],
	viewerId: string | null,
): Promise<FeedPost[]> {
	if (seeds.length === 0) return [];
	const postIds = seeds.map((seed) => seed.postId);

	const imageRows = await db
		.selectFrom("postImages")
		.select(["postImagePostId", "postImageKey"])
		.where("postImagePostId", "in", postIds)
		.orderBy("postImagePosition", "asc")
		.execute();
	const imagesByPost = new Map<string, string[]>();
	for (const image of imageRows) {
		const keys = imagesByPost.get(image.postImagePostId) ?? [];
		keys.push(image.postImageKey);
		imagesByPost.set(image.postImagePostId, keys);
	}

	const commentRows = await db
		.selectFrom("comments")
		.innerJoin("users", "users.userId", "comments.commentAuthorId")
		.select([
			"comments.commentId",
			"comments.commentPostId",
			"comments.commentText",
			"users.userUsername",
		])
		.where("comments.commentPostId", "in", postIds)
		.orderBy("comments.commentCreatedAt", "desc")
		.limit(postIds.length * FEED_COMMENT_PREVIEWS)
		.execute();
	const previewsByPost = new Map<string, FeedComment[]>();
	for (const comment of commentRows) {
		const previews = previewsByPost.get(comment.commentPostId) ?? [];
		if (previews.length < FEED_COMMENT_PREVIEWS) {
			previews.push({
				commentId: comment.commentId,
				authorUsername: comment.userUsername,
				text: comment.commentText,
			});
		}
		previewsByPost.set(comment.commentPostId, previews);
	}

	const likedIds = new Set<string>();
	const bookmarkedIds = new Set<string>();
	if (viewerId) {
		const likes = await db
			.selectFrom("likes")
			.select("likePostId")
			.where("likeUserId", "=", viewerId)
			.where("likePostId", "in", postIds)
			.execute();
		for (const like of likes) likedIds.add(like.likePostId);

		const bookmarks = await db
			.selectFrom("bookmarks")
			.select("bookmarkPostId")
			.where("bookmarkUserId", "=", viewerId)
			.where("bookmarkPostId", "in", postIds)
			.execute();
		for (const bookmark of bookmarks) bookmarkedIds.add(bookmark.bookmarkPostId);
	}

	return seeds.map((seed) => ({
		postId: seed.postId,
		author: {
			userId: seed.postAuthorId,
			username: seed.authorUsername,
			avatarKey: seed.authorAvatarKey,
		},
		location: seed.postLocation,
		caption: seed.postCaption,
		imageKeys: imagesByPost.get(seed.postId) ?? [],
		likeCount: Number(seed.likeCount),
		commentCount: Number(seed.commentCount),
		likedByMe: likedIds.has(seed.postId),
		bookmarkedByMe: bookmarkedIds.has(seed.postId),
		comments: previewsByPost.get(seed.postId) ?? [],
		createdAt: seed.postCreatedAt,
	}));
}

/** Throws a 404 if the post doesn't exist. */
export async function ensurePostExists(db: Database, postId: string): Promise<void> {
	const post = await db
		.selectFrom("posts")
		.select("postId")
		.where("postId", "=", postId)
		.executeTakeFirst();
	if (!post) {
		error(404, "Post not found");
	}
}

/**
 * Batched like/comment counts for a set of posts — two grouped queries
 * instead of one correlated COUNT subquery per post. A page of N posts scans
 * the likes/comments tables exactly once regardless of how viral a post is,
 * which keeps anonymous feed reads off the D1 row budget.
 */
export async function fetchPostCounts(
	db: Database,
	postIds: string[],
): Promise<{ likeCounts: Map<string, number>; commentCounts: Map<string, number> }> {
	const likeCounts = new Map<string, number>();
	const commentCounts = new Map<string, number>();
	if (postIds.length === 0) return { likeCounts, commentCounts };

	const [likeRows, commentRows] = await Promise.all([
		db
			.selectFrom("likes")
			.select(["likePostId", db.fn.countAll().as("count")])
			.where("likePostId", "in", postIds)
			.groupBy("likePostId")
			.execute(),
		db
			.selectFrom("comments")
			.select(["commentPostId", db.fn.countAll().as("count")])
			.where("commentPostId", "in", postIds)
			.groupBy("commentPostId")
			.execute(),
	]);

	for (const row of likeRows) likeCounts.set(row.likePostId, Number(row.count));
	for (const row of commentRows) commentCounts.set(row.commentPostId, Number(row.count));
	return { likeCounts, commentCounts };
}

export async function countPostLikes(db: Database, postId: string): Promise<number> {
	const row = await db
		.selectFrom("likes")
		.where("likePostId", "=", postId)
		.select(db.fn.countAll().as("count"))
		.executeTakeFirstOrThrow();
	return Number(row.count);
}

export async function countPostBookmarks(db: Database, postId: string): Promise<number> {
	const row = await db
		.selectFrom("bookmarks")
		.where("bookmarkPostId", "=", postId)
		.select(db.fn.countAll().as("count"))
		.executeTakeFirstOrThrow();
	return Number(row.count);
}
