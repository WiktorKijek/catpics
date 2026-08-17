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

/** A post's comments, newest first, paginated via keyset cursor. */
export function usePostComments(postId: string) {
	return createInfiniteQuery(() => ({
		queryKey: ["comments", postId],
		queryFn: ({ pageParam }) => listComments({ postId, cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: CommentsPage) => lastPage.nextCursor,
		enabled: postId.length > 0,
	}));
}

export type { CreateCommentInput, CreatedComment, CommentsPage, ListCommentsInput };
