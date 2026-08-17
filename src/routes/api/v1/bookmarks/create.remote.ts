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

export const createBookmark = command(
	BookmarkInputSchema,
	async (input): Promise<BookmarkState> => {
		const event = getRequestEvent();
		const session = requireSession(event);
		const db = event.locals.database;

		await ensurePostExists(db, input.postId);

		const alreadyBookmarked = await db
			.selectFrom("bookmarks")
			.select("bookmarkPostId")
			.where("bookmarkPostId", "=", input.postId)
			.where("bookmarkUserId", "=", session.userId)
			.executeTakeFirst();

		if (alreadyBookmarked) {
			error(409, "You already bookmarked this post");
		}

		try {
			await db
				.insertInto("bookmarks")
				.values({
					bookmarkPostId: input.postId,
					bookmarkUserId: session.userId,
					bookmarkCreatedAt: Date.now(),
				})
				.execute();
		} catch (e) {
			// Another request bookmarked this post between the check above and the insert
			if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
				error(409, "You already bookmarked this post");
			}
			throw e;
		}

		return { bookmarked: true, bookmarkCount: await countPostBookmarks(db, input.postId) };
	},
);
