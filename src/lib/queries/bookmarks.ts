import { createInfiniteQuery, createMutation } from "@tanstack/svelte-query";
import {
	createBookmark,
	type BookmarkInput,
	type BookmarkState,
} from "#routes/api/v1/bookmarks/create.remote";
import { removeBookmark } from "#routes/api/v1/bookmarks/delete.remote";
import {
	listBookmarks,
	type FeedPage,
	type ListBookmarksInput,
} from "#routes/api/v1/bookmarks/list.remote";

export function useBookmark() {
	return createMutation(() => ({
		mutationFn: (input: BookmarkInput) => createBookmark(input),
	}));
}

export function useUnbookmark() {
	return createMutation(() => ({
		mutationFn: (input: BookmarkInput) => removeBookmark(input),
	}));
}

/**
 * The viewer's saved posts, most recently bookmarked first.
 *
 * The cache key carries the viewer's username so switching accounts (logout
 * -> login as someone else) can't serve one user's private bookmarks to
 * another. Pass a getter, e.g. `useBookmarkedPosts(() => session?.username ?? "")`.
 * The opts accessor, e.g. `() => ({ enabled: !!session })`, skips fetching
 * while signed out.
 */
export function useBookmarkedPosts(
	username: () => string = () => "",
	opts: () => { enabled?: boolean } = () => ({}),
) {
	return createInfiniteQuery(() => ({
		queryKey: ["bookmarks", "list", username()],
		queryFn: ({ pageParam }) => listBookmarks({ cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor,
		...opts(),
	}));
}

export type { BookmarkInput, BookmarkState, FeedPage, ListBookmarksInput };
