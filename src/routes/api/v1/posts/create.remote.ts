import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";
import { batch } from "#lib/server/db";
import { recordPostDay } from "#lib/server/streaks";

const CreatePostSchema = v.object({
	caption: v.optional(
		v.pipe(v.string(), v.trim(), v.maxLength(2200, "Caption must be at most 2200 characters")),
	),
	location: v.optional(
		v.pipe(v.string(), v.trim(), v.maxLength(200, "Location must be at most 200 characters")),
	),
	imageKeys: v.pipe(
		v.array(v.pipe(v.string(), v.trim(), v.minLength(1, "Image key cannot be empty"))),
		v.minLength(1, "A post needs at least one image"),
		v.maxLength(10, "A post can have at most 10 images"),
	),
});

export type CreatePostInput = v.InferInput<typeof CreatePostSchema>;

export type CreatedPost = {
	postId: string;
	createdAt: number;
	/** True when this post counted towards the user's streak (it grew or started). */
	streakIncreased: boolean;
};

export const createPost = command(CreatePostSchema, async (input): Promise<CreatedPost> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const caption = input.caption || null;
	const location = input.location || null;
	// Deduplicate keys so a single image can't be attached to the post twice.
	const imageKeys = [...new Set(input.imageKeys)];

	const postId = crypto.randomUUID();
	const createdAt = Date.now();

	// `batch` runs the post, its images and the streak update in a single D1
	// batch so they land atomically. `recordPostDay` is null when the user
	// already posted today, so the streak write is skipped entirely.
	const streakUpsert = await recordPostDay(db, session.userId, new Date(createdAt));

	await batch(db, [
		db
			.insertInto("posts")
			.values({
				postId,
				postAuthorId: session.userId,
				postCaption: caption,
				postLocation: location,
				postCreatedAt: createdAt,
			})
			.compile(),
		...imageKeys.map((key, index) =>
			db
				.insertInto("postImages")
				.values({
					postImageId: crypto.randomUUID(),
					postImagePostId: postId,
					postImageKey: key,
					postImagePosition: index,
				})
				.compile(),
		),
		...(streakUpsert ? [streakUpsert] : []),
	]);

	return { postId, createdAt, streakIncreased: streakUpsert !== null };
});
