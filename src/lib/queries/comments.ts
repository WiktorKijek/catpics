import { createInfiniteQuery, createMutation } from "@tanstack/svelte-query";
import {
	createComment,
	type CreateCommentInput,
	type CreatedComment,
} from "#routes/api/v1/comments/create.remote";
import {
	listComments,
	type CommentsPage,
	type ListCommentsInput,
} from "#routes/api/v1/comments/list.remote";

export function useCreateComment() {
	return createMutation(() => ({
		mutationFn: (input: CreateCommentInput) => createComment(input),
	}));
}

/**
 * A post's comments, newest first, paginated via keyset cursor.
 *
 * Fetching is gated on `enabled` so a comments dialog only loads its data
 * while it's open; the result stays cached (and reusable) after closing.
 * Pass an accessor (`() => open`) so the gate reacts to state changes.
 */
export function usePostComments(postId: string, enabled: () => boolean = () => true) {
	return createInfiniteQuery(() => ({
		queryKey: ["comments", postId],
		queryFn: ({ pageParam }) => listComments({ postId, cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: CommentsPage) => lastPage.nextCursor,
		enabled: enabled() && postId.length > 0,
	}));
}

export type { CreateCommentInput, CreatedComment, CommentsPage, ListCommentsInput };
