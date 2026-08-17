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

export const createLike = command(LikeInputSchema, async (input): Promise<LikeState> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	await ensurePostExists(db, input.postId);

	const alreadyLiked = await db
		.selectFrom("likes")
		.select("likePostId")
		.where("likePostId", "=", input.postId)
		.where("likeUserId", "=", session.userId)
		.executeTakeFirst();

	if (alreadyLiked) {
		error(409, "You already liked this post");
	}

	try {
		await db
			.insertInto("likes")
			.values({
				likePostId: input.postId,
				likeUserId: session.userId,
				likeCreatedAt: Date.now(),
			})
			.execute();
	} catch (e) {
		// Another request liked this post between the check above and the insert
		if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
			error(409, "You already liked this post");
		}
		throw e;
	}

	return { liked: true, likeCount: await countPostLikes(db, input.postId) };
});
