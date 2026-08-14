import { createInfiniteQuery } from "@tanstack/svelte-query";
import { fetchFeedPage, type FeedPage } from "#lib/mock/feed";

export function useFeed() {
	return createInfiniteQuery(() => ({
		queryKey: ["feed"],
		queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
		initialPageParam: 0,
		getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor,
	}));
}
