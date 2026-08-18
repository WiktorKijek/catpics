import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { keysetCursorSchema, type KeysetCursor } from "#lib/cursor";
import { fetchPostCounts } from "#lib/server/posts";

const PAGE_SIZE = 12;

const GetUserPostsSchema = v.object({
	userId: v.pipe(v.string(), v.trim(), v.minLength(1, "User id is required")),
	cursor: v.optional(v.nullable(keysetCursorSchema)),
});

export type GetUserPostsInput = v.InferInput<typeof GetUserPostsSchema>;

export type UserPostSummary = {
	postId: string;
	coverKey: string | null;
	likeCount: number;
	commentCount: number;
	createdAt: number;
};

export type UserPostsPage = {
	posts: UserPostSummary[];
	nextCursor: KeysetCursor | null;
};

/** A user's recent posts (profile grid), newest first, with the cover image only. */
export const getUserPosts = command(GetUserPostsSchema, async (input): Promise<UserPostsPage> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const cursor = input.cursor ?? null;

	const user = await db
		.selectFrom("users")
		.select("userId")
		.where("userId", "=", input.userId)
		.executeTakeFirst();
	if (!user) {
		error(404, "User not found");
	}

	let query = db.selectFrom("posts").select(["posts.postId", "posts.postCreatedAt"])
		.where("posts.postAuthorId", "=", input.userId);

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

	const { likeCounts, commentCounts } = await fetchPostCounts(
		db,
		rows.map((row) => row.postId),
	);

	const covers = new Map<string, string | null>();
	if (rows.length > 0) {
		const images = await db
			.selectFrom("postImages")
			.select(["postImagePostId", "postImageKey"])
			.where(
				"postImagePostId",
				"in",
				rows.map((row) => row.postId),
			)
			.orderBy("postImagePosition", "asc")
			.execute();
		for (const image of images) {
			if (!covers.has(image.postImagePostId))
				covers.set(image.postImagePostId, image.postImageKey);
		}
	}

	const posts: UserPostSummary[] = rows.map((row) => ({
		postId: row.postId,
		coverKey: covers.get(row.postId) ?? null,
		likeCount: likeCounts.get(row.postId) ?? 0,
		commentCount: commentCounts.get(row.postId) ?? 0,
		createdAt: row.postCreatedAt,
	}));

	const last = posts[posts.length - 1];
	const nextCursor =
		posts.length === PAGE_SIZE && last ? { createdAt: last.createdAt, id: last.postId } : null;

	return { posts, nextCursor };
});
