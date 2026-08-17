import { createMutation } from "@tanstack/svelte-query";
import { createFollow } from "../../routes/api/v1/follows/create.remote.ts";
import { deleteFollow } from "../../routes/api/v1/follows/delete.remote.ts";

type FollowInput = { userId: string };

export type FollowState = {
	followed: boolean;
	followerCount: number;
};

export function useFollow() {
	return createMutation(() => ({
		mutationFn: (input: FollowInput) => createFollow(input),
	}));
}

export function useUnfollow() {
	return createMutation(() => ({
		mutationFn: (input: FollowInput) => deleteFollow(input),
	}));
}

export type { FollowInput };
