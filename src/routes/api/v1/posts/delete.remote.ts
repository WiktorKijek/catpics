import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

const DeletePostSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
});

export type DeletePostInput = v.InferInput<typeof DeletePostSchema>;

export type DeletedPost = {
	postId: string;
};

/**
 * Permanently removes a post. Authors can always delete their own posts,
 * admins can delete any post. Likes, bookmarks, comments and image rows
 * cascade via foreign keys; the photo objects are cleaned up from the
 * bucket best-effort.
 */
export const deletePost = command(DeletePostSchema, async (input): Promise<DeletedPost> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const post = await db
		.selectFrom("posts")
		.select(["postId", "postAuthorId"])
		.where("postId", "=", input.postId)
		.executeTakeFirst();

	if (!post) {
		error(404, "Post not found");
	}

	if (post.postAuthorId !== session.userId && !session.isAdmin) {
		error(403, "You can only delete your own posts");
	}

	// Remove the stored photos from the bucket so a deleted post doesn't leave
	// orphaned objects behind. Best-effort only: the DB row is what makes the
	// post disappear, so an R2 hiccup must not block the deletion.
	const platform = event.platform;
	if (platform) {
		try {
			const imageRows = await db
				.selectFrom("postImages")
				.select("postImageKey")
				.where("postImagePostId", "=", input.postId)
				.execute();
			if (imageRows.length > 0) {
				await platform.env.BUCKET.delete(imageRows.map((row) => row.postImageKey));
			}
		} catch {
			// Ignore R2 failures — the post is being deleted anyway.
		}
	}

	await db.deleteFrom("posts").where("postId", "=", input.postId).execute();

	return { postId: input.postId };
});