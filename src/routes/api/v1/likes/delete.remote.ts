import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";
import { countPostLikes, ensurePostExists } from "#lib/server/posts";

const LikeInputSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
});

export type LikeInput = v.InferInput<typeof LikeInputSchema>;

export type LikeState = {
	liked: boolean;
	likeCount: number;
};

export const removeLike = command(LikeInputSchema, async (input): Promise<LikeState> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	await ensurePostExists(db, input.postId);

	const like = await db
		.selectFrom("likes")
		.select("likePostId")
		.where("likePostId", "=", input.postId)
		.where("likeUserId", "=", session.userId)
		.executeTakeFirst();

	if (!like) {
		error(404, "You haven't liked this post");
	}

	await db
		.deleteFrom("likes")
		.where("likePostId", "=", input.postId)
		.where("likeUserId", "=", session.userId)
		.execute();

	return { liked: false, likeCount: await countPostLikes(db, input.postId) };
});
