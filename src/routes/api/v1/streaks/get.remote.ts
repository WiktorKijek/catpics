import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { readStreakState, summarizeStreak, type StreakSummary } from "#lib/server/streaks";

const GetStreakSchema = v.object({
	userId: v.pipe(v.string(), v.trim(), v.minLength(1, "User id is required")),
});

export type StreakLookup = v.InferInput<typeof GetStreakSchema>;

export type { StreakSummary as PublicStreak };

/** A user's post streak: consecutive days with at least one post, or zeros when they have none. */
export const getStreak = command(GetStreakSchema, async (input): Promise<StreakSummary> => {
	const event = getRequestEvent();
	const db = event.locals.database;

	const user = await db
		.selectFrom("users")
		.select("userId")
		.where("userId", "=", input.userId)
		.executeTakeFirst();
	if (!user) {
		error(404, "User not found");
	}

	return summarizeStreak(await readStreakState(db, input.userId), new Date());
});
