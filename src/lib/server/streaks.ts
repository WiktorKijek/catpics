import type { Database } from "#lib/server/db";
import type { CompiledQuery } from "kysely";

// ---------------------------------------------------------------------------
// Daily post streak: one post on at least one UTC day per day keeps the
// streak alive. Days are "YYYY-MM-DD" keys in UTC; a streak started yesterday
// still counts until the current UTC day ends (grace period).
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" for `date` in UTC. */
export function utcDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Advances a "YYYY-MM-DD" key by `days` (UTC-safe across month/year edges). */
export function addUtcDays(dateKey: string, days: number): string {
	return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * 86_400_000)
		.toISOString()
		.slice(0, 10);
}

export type StreakState = {
	current: number;
	longest: number;
	lastDate: string | null;
};

export type StreakSummary = StreakState & {
	active: boolean;
};

export async function readStreakState(
	db: Database,
	userId: string,
): Promise<StreakState | undefined> {
	const row = await db
		.selectFrom("postStreaks")
		.select(["postStreakCurrent", "postStreakLongest", "postStreakLastDate"])
		.where("postStreakUserId", "=", userId)
		.executeTakeFirst();

	return row
		? {
				current: row.postStreakCurrent,
				longest: row.postStreakLongest,
				lastDate: row.postStreakLastDate,
			}
		: undefined;
}

/**
 * Fold yesterday/today's post into the streak. A post after yesterday's
 * extends the run, a gap of a day or more starts a new run (longest stays).
 */
export function nextStreak(prev: StreakState | undefined, today: string): StreakState {
	if (prev && prev.lastDate === today) return prev;
	if (prev && prev.lastDate === addUtcDays(today, -1)) {
		const current = prev.current + 1;
		return { current, longest: Math.max(prev.longest, current), lastDate: today };
	}
	return { current: 1, longest: prev ? prev.longest : 1, lastDate: today };
}

/**
 * Read-side view: `current` falls to 0 once the latest posting day is older
 * than yesterday, so a stale row never reports a living streak.
 */
export function summarizeStreak(state: StreakState | undefined, now: Date): StreakSummary {
	const lastDate = state?.lastDate ?? null;
	const today = utcDateKey(now);
	const active = lastDate !== null && (lastDate === today || lastDate === addUtcDays(today, -1));

	return {
		current: active && state ? state.current : 0,
		longest: state?.longest ?? 0,
		lastDate,
		active,
	};
}

/**
 * The upsert that records a post for the user's streak. Returns null when the
 * user already posted today, so callers can skip the write entirely. Include
 * the returned query in the same batch as the post so both land atomically.
 */
export async function recordPostDay(
	db: Database,
	userId: string,
	now: Date,
): Promise<CompiledQuery | null> {
	const today = utcDateKey(now);
	const prev = await readStreakState(db, userId);
	if (prev && prev.lastDate === today) return null;

	const next = nextStreak(prev, today);
	return db
		.insertInto("postStreaks")
		.values({
			postStreakUserId: userId,
			postStreakCurrent: next.current,
			postStreakLongest: next.longest,
			postStreakLastDate: next.lastDate,
		})
		.onConflict((oc) =>
			oc.column("postStreakUserId").doUpdateSet((eb) => ({
				postStreakCurrent: eb.ref("excluded.postStreakCurrent"),
				postStreakLongest: eb.ref("excluded.postStreakLongest"),
				postStreakLastDate: eb.ref("excluded.postStreakLastDate"),
			})),
		)
		.compile();
}
