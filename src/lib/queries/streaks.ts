import { createQuery } from "@tanstack/svelte-query";
import { getStreak, type PublicStreak, type StreakLookup } from "#routes/api/v1/streaks/get.remote";
import { getMyStreak, type MyStreak } from "#routes/api/v1/streaks/me.remote";

/**
 * The viewer's own streak. Keyed by the viewer's username so the cache isn't
 * shared between accounts after a logout/login.
 */
export function useMyStreak(username: () => string = () => "") {
	return createQuery(() => ({
		queryKey: ["streaks", "me", username()],
		queryFn: () => getMyStreak(),
	}));
}

/** Another user's public post streak, e.g. on their profile. */
export function useStreak(userId: string) {
	return createQuery(() => ({
		queryKey: ["streaks", userId],
		queryFn: () => getStreak({ userId }),
		enabled: userId.length > 0,
	}));
}

export type { MyStreak, PublicStreak, StreakLookup };
