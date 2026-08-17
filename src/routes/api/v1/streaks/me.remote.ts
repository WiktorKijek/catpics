import { command, getRequestEvent } from "$app/server";
import { requireSession } from "#lib/server/auth";
import { readStreakState, summarizeStreak, utcDateKey } from "#lib/server/streaks";

export type MyStreak = {
	current: number;
	longest: number;
	lastDate: string | null;
	active: boolean;
	postedToday: boolean;
};

/** The logged-in user's streak. `postedToday` tells whether posting again right now extends nothing. */
export const getMyStreak = command(async (): Promise<MyStreak> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const now = new Date();
	const summary = summarizeStreak(await readStreakState(db, session.userId), now);
	return { ...summary, postedToday: summary.lastDate === utcDateKey(now) };
});
