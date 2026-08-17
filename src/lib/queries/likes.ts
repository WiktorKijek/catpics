import { createMutation } from "@tanstack/svelte-query";
import {
	createLike,
	type LikeInput,
	type LikeState,
} from "../../routes/api/v1/likes/create.remote.ts";
import { removeLike } from "../../routes/api/v1/likes/delete.remote.ts";

export function useLike() {
	return createMutation(() => ({
		mutationFn: (input: LikeInput) => createLike(input),
	}));
}

export function useUnlike() {
	return createMutation(() => ({
		mutationFn: (input: LikeInput) => removeLike(input),
	}));
}

export type { LikeInput, LikeState };
