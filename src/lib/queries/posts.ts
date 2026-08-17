import { createInfiniteQuery, createMutation, createQuery } from "@tanstack/svelte-query";
import {
	uploadImage,
	type UploadImageInput,
	type UploadedImage,
} from "#routes/api/v1/images/upload.remote";
import {
	getUserPosts,
	type GetUserPostsInput,
	type UserPostsPage,
} from "#routes/api/v1/posts/byUser.remote";
import {
	createPost,
	type CreatePostInput,
	type CreatedPost,
} from "#routes/api/v1/posts/create.remote";
import { getPost, type GetPostInput, type PostDetail } from "#routes/api/v1/posts/get.remote";
import {
	deletePost,
	type DeletePostInput,
	type DeletedPost,
} from "#routes/api/v1/posts/delete.remote";

export function useCreatePost() {
	return createMutation(() => ({
		mutationFn: (input: CreatePostInput) => createPost(input),
	}));
}

/** Uploads a photo (base64 data URL) to R2 and returns the object key to attach to a post. */
export function useUploadImage() {
	return createMutation(() => ({
		mutationFn: (input: UploadImageInput) => uploadImage(input),
	}));
}

export function useDeletePost() {
	return createMutation(() => ({
		mutationFn: (input: DeletePostInput) => deletePost(input),
	}));
}

export function usePost(postId: string) {
	return createQuery(() => ({
		queryKey: ["post", postId],
		queryFn: () => getPost({ postId }),
		enabled: postId.length > 0,
	}));
}

/** A user's posts, paginated via keyset cursor (profile grid). */
export function useUserPosts(userId: string) {
	return createInfiniteQuery(() => ({
		queryKey: ["user-posts", userId],
		queryFn: ({ pageParam }) => getUserPosts({ userId, cursor: pageParam }),
		initialPageParam: null,
		getNextPageParam: (lastPage: UserPostsPage) => lastPage.nextCursor,
		enabled: userId.length > 0,
	}));
}

export type {
	CreatePostInput,
	CreatedPost,
	DeletePostInput,
	DeletedPost,
	GetPostInput,
	PostDetail,
	GetUserPostsInput,
	UserPostsPage,
	UploadImageInput,
	UploadedImage,
};
