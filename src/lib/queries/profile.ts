import { createMutation, createQuery } from "@tanstack/svelte-query";
import {
	uploadAvatar,
	type UploadAvatarInput,
	type UploadedAvatar,
} from "#routes/api/v1/avatar/upload.remote";
import {
	getProfile,
	type ProfileLookup,
	type PublicProfile,
} from "#routes/api/v1/profile/get.remote";
import { getMyProfile, type MyProfile } from "#routes/api/v1/profile/me.remote";
import {
	updateProfile,
	type Profile,
	type UpdateProfileInput,
} from "#routes/api/v1/profile/update.remote";

export function useUpdateProfile() {
	return createMutation(() => ({
		mutationFn: (input: UpdateProfileInput) => updateProfile(input),
	}));
}

/** Uploads an avatar (base64 data URL) to R2, rescaled to square 512px/64px webp. */
export function useUploadAvatar() {
	return createMutation(() => ({
		mutationFn: (input: UploadAvatarInput) => uploadAvatar(input),
	}));
}

/**
 * The viewer's own profile. Keyed by the viewer's username so the cache isn't
 * shared between accounts after a logout/login.
 */
export function useMyProfile(username: () => string = () => "") {
	return createQuery(() => ({
		queryKey: ["profile", "me", username()],
		queryFn: () => getMyProfile(),
	}));
}

export function useProfile(lookup: ProfileLookup = {}) {
	return createQuery(() => ({
		queryKey: ["profile", lookup],
		queryFn: () => getProfile(lookup),
		enabled: lookup.userId !== undefined || lookup.username !== undefined,
	}));
}

export type {
	Profile,
	UpdateProfileInput,
	MyProfile,
	ProfileLookup,
	PublicProfile,
	UploadAvatarInput,
	UploadedAvatar,
};
