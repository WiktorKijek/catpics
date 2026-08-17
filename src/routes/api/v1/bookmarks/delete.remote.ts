import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";
import { countPostBookmarks, ensurePostExists } from "#lib/server/posts";

const BookmarkInputSchema = v.object({
	postId: v.pipe(v.string(), v.trim(), v.minLength(1, "Post id is required")),
});

export type BookmarkInput = v.InferInput<typeof BookmarkInputSchema>;

export type BookmarkState = {
	bookmarked: boolean;
	bookmarkCount: number;
};

export const removeBookmark = command(
	BookmarkInputSchema,
	async (input): Promise<BookmarkState> => {
		const event = getRequestEvent();
		const session = requireSession(event);
		const db = event.locals.database;

		await ensurePostExists(db, input.postId);

		const bookmark = await db
			.selectFrom("bookmarks")
			.select("bookmarkPostId")
			.where("bookmarkPostId", "=", input.postId)
			.where("bookmarkUserId", "=", session.userId)
			.executeTakeFirst();

		if (!bookmark) {
			error(404, "You haven't bookmarked this post");
		}

		await db
			.deleteFrom("bookmarks")
			.where("bookmarkPostId", "=", input.postId)
			.where("bookmarkUserId", "=", session.userId)
			.execute();

		return { bookmarked: false, bookmarkCount: await countPostBookmarks(db, input.postId) };
	},
);
