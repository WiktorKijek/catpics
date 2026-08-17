import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";
import { ensurePostExists } from "#lib/server/posts";

const CreateCommentSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
	text: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "Comment cannot be empty"),
		v.maxLength(500, "Comment must be at most 500 characters"),
	),
});

export type CreateCommentInput = v.InferInput<typeof CreateCommentSchema>;

export type CreatedComment = {
	commentId: string;
	postId: string;
	authorId: string;
	authorUsername: string;
	text: string;
	createdAt: number;
};

export const createComment = command(
	CreateCommentSchema,
	async (input): Promise<CreatedComment> => {
		const event = getRequestEvent();
		const session = requireSession(event);
		const db = event.locals.database;

		await ensurePostExists(db, input.postId);

		const author = await db
			.selectFrom("users")
			.select("userUsername")
			.where("userId", "=", session.userId)
			.executeTakeFirstOrThrow();

		const commentId = crypto.randomUUID();
		const createdAt = Date.now();

		await db
			.insertInto("comments")
			.values({
				commentId,
				commentPostId: input.postId,
				commentAuthorId: session.userId,
				commentText: input.text,
				commentCreatedAt: createdAt,
			})
			.execute();

		return {
			commentId,
			postId: input.postId,
			authorId: session.userId,
			authorUsername: author.userUsername,
			text: input.text,
			createdAt,
		};
	},
);
