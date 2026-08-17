import { createInfiniteQuery } from "@tanstack/svelte-query";
import {
	listUsers,
	type ListUsersInput,
	type UserSummary,
	type UsersPage,
} from "#routes/api/v1/users/list.remote";

/**
 * Browse registered users, filtered by an optional search term, with infinite
 * scroll via the username keyset cursor.
 *
 * `search` can be a plain string or a getter — pass a getter (e.g.
 * `useUsers(() => term)`) when the term lives in component state so the query
 * reacts to changes.
 */
export function useUsers(search: string | (() => string) = "") {
	const term = () => (typeof search === "function" ? search() : search);
	return createInfiniteQuery(() => ({
		queryKey: ["users", term()],
		queryFn: ({ pageParam }) =>
			listUsers({ search: term().trim() || undefined, cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: UsersPage) => lastPage.nextCursor,
	}));
}

export type { ListUsersInput, UserSummary, UsersPage };
