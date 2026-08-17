import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

const FollowInputSchema = v.object({
	userId: v.pipe(v.string(), v.trim(), v.minLength(1, "User id is required")),
});

export type FollowInput = v.InferInput<typeof FollowInputSchema>;

export type FollowState = {
	followed: boolean;
	followerCount: number;
};

export const createFollow = command(FollowInputSchema, async (input): Promise<FollowState> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const user = await db
		.selectFrom("users")
		.select("userId")
		.where("userId", "=", input.userId)
		.executeTakeFirst();
	if (!user) {
		error(404, "User not found");
	}
	if (user.userId === session.userId) {
		error(400, "You can't follow yourself");
	}

	const alreadyFollowing = await db
		.selectFrom("follows")
		.select("followFollowingId")
		.where("followFollowerId", "=", session.userId)
		.where("followFollowingId", "=", input.userId)
		.executeTakeFirst();

	if (alreadyFollowing) {
		error(409, "You already follow this user");
	}

	try {
		await db
			.insertInto("follows")
			.values({
				followFollowerId: session.userId,
				followFollowingId: input.userId,
				followCreatedAt: Date.now(),
			})
			.execute();
	} catch (e) {
		// Another request followed this user between the check above and the insert
		if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
			error(409, "You already follow this user");
		}
		throw e;
	}

	const count = await db
		.selectFrom("follows")
		.select(db.fn.countAll().as("count"))
		.where("followFollowingId", "=", input.userId)
		.execute();
	return { followed: true, followerCount: Number(count[0]?.count ?? 0) };
});
