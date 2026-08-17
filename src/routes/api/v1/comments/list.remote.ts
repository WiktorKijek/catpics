import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { keysetCursorSchema, type KeysetCursor } from "#lib/cursor";
import { ensurePostExists, type PostAuthor } from "#lib/server/posts";

const PAGE_SIZE = 30;

const ListCommentsSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
	cursor: v.optional(v.nullable(keysetCursorSchema)),
});

export type ListCommentsInput = v.InferInput<typeof ListCommentsSchema>;

export type Comment = {
	commentId: string;
	author: PostAuthor;
	text: string;
	createdAt: number;
};

export type CommentsPage = {
	comments: Comment[];
	nextCursor: KeysetCursor | null;
};

/** A post's comments, newest first, paginated with a keyset cursor. */
export const listComments = command(ListCommentsSchema, async (input): Promise<CommentsPage> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const cursor = input.cursor ?? null;

	await ensurePostExists(db, input.postId);

	let query = db
		.selectFrom("comments")
		.innerJoin("users", "users.userId", "comments.commentAuthorId")
		.leftJoin("profiles", "profiles.profileUserId", "comments.commentAuthorId")
		.select([
			"comments.commentId",
			"comments.commentText",
			"comments.commentCreatedAt",
			"comments.commentAuthorId",
			"users.userUsername as authorUsername",
			"profiles.profileAvatarKey as authorAvatarKey",
		])
		.where("comments.commentPostId", "=", input.postId);

	if (cursor) {
		query = query.where((eb) =>
			eb.or([
				eb("comments.commentCreatedAt", "<", cursor.createdAt),
				eb.and([
					eb("comments.commentCreatedAt", "=", cursor.createdAt),
					eb("comments.commentId", "<", cursor.id),
				]),
			]),
		);
	}

	const rows = await query
		.orderBy("comments.commentCreatedAt", "desc")
		.orderBy("comments.commentId", "desc")
		.limit(PAGE_SIZE)
		.execute();

	const comments: Comment[] = rows.map((row) => ({
		commentId: row.commentId,
		author: {
			userId: row.commentAuthorId,
			username: row.authorUsername,
			avatarKey: row.authorAvatarKey,
		},
		text: row.commentText,
		createdAt: row.commentCreatedAt,
	}));

	const last = comments[comments.length - 1];
	const nextCursor =
		comments.length === PAGE_SIZE && last
			? { createdAt: last.createdAt, id: last.commentId }
			: null;

	return { comments, nextCursor };
});
