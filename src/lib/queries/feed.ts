import { createInfiniteQuery } from "@tanstack/svelte-query";
import { getFeedPage, type FeedPage, type FeedPost } from "#routes/api/v1/posts/feed.remote";

/**
 * Infinite-scroll home feed backed by the database (see posts/feed.remote.ts).
 *
 * The response is viewer-personalized (liked/bookmarked state), so the cache
 * key carries the viewer's username — otherwise the cache would be shared
 * across accounts after a logout/login and leak the previous user's state.
 * Pass a getter (e.g. `useFeed(() => session?.username ?? "")`) so the key
 * reacts to session changes.
 */
export function useFeed(username: () => string = () => "") {
	return createInfiniteQuery(() => ({
		queryKey: ["feed", username()],
		queryFn: ({ pageParam }) => getFeedPage({ cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor,
	}));
}

export type { FeedPage, FeedPost };
