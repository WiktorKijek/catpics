import { createInfiniteQuery } from "@tanstack/svelte-query";
import { getFeedPage, type FeedPage, type FeedPost } from "#routes/api/v1/posts/feed.remote";

/** Infinite-scroll home feed backed by the database (see posts/feed.remote.ts). */
export function useFeed() {
	return createInfiniteQuery(() => ({
		queryKey: ["feed"],
		queryFn: ({ pageParam }) => getFeedPage({ cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor,
	}));
}

export type { FeedPage, FeedPost };
