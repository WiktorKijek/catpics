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

export const deleteFollow = command(FollowInputSchema, async (input): Promise<FollowState> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const follow = await db
		.selectFrom("follows")
		.select("followFollowingId")
		.where("followFollowerId", "=", session.userId)
		.where("followFollowingId", "=", input.userId)
		.executeTakeFirst();

	if (!follow) {
		error(404, "You don't follow this user");
	}

	await db
		.deleteFrom("follows")
		.where("followFollowerId", "=", session.userId)
		.where("followFollowingId", "=", input.userId)
		.execute();

	const count = await db
		.selectFrom("follows")
		.select(db.fn.countAll().as("count"))
		.where("followFollowingId", "=", input.userId)
		.execute();
	return { followed: false, followerCount: Number(count[0]?.count ?? 0) };
});
