import { createQuery } from "@tanstack/svelte-query";
import { getStreak, type PublicStreak, type StreakLookup } from "#routes/api/v1/streaks/get.remote";
import { getMyStreak, type MyStreak } from "#routes/api/v1/streaks/me.remote";

export function useMyStreak() {
	return createQuery(() => ({
		queryKey: ["streaks", "me"],
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
