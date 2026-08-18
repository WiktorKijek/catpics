import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

const UpdateProfileSchema = v.object({
	bio: v.optional(
		v.pipe(v.string(), v.trim(), v.maxLength(200, "Bio must be at most 200 characters")),
	),
	avatarKey: v.optional(
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(500, "Avatar key must be at most 500 characters"),
			// A key must look like an R2 object key (`posts/x/...` or
			// `avatars/x/...`); an empty string is allowed and clears the avatar.
			v.check(
				(key) => key === "" || /^(posts|avatars)\/[^/]+\//.test(key),
				"Avatar key must reference an uploaded object",
			),
		),
	),
});

export type UpdateProfileInput = v.InferInput<typeof UpdateProfileSchema>;

export type Profile = {
	profileUserId: string;
	bio: string | null;
	avatarKey: string | null;
};

// Omitted fields keep their current value; an explicit empty string clears them.
export const updateProfile = command(UpdateProfileSchema, async (input): Promise<Profile> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	// Scope the key to the session user's own namespaces: rendering someone
	// else's upload as your avatar is content spoofing, and the avatar upload
	// route only ever mints keys under `avatars/<userId>/`.
	if (input.avatarKey !== undefined && input.avatarKey !== "") {
		const ownAvatar = `avatars/${session.userId}/`;
		const ownPosts = `posts/${session.userId}/`;
		if (!input.avatarKey.startsWith(ownAvatar) && !input.avatarKey.startsWith(ownPosts)) {
			error(400, "Avatar key must reference your own uploads");
		}
	}

	const existing = await db
		.selectFrom("profiles")
		.select(["profileBio", "profileAvatarKey"])
		.where("profileUserId", "=", session.userId)
		.executeTakeFirst();

	const bio = input.bio === undefined ? (existing?.profileBio ?? null) : input.bio || null;
	const avatarKey =
		input.avatarKey === undefined
			? (existing?.profileAvatarKey ?? null)
			: input.avatarKey || null;

	if (existing) {
		await db
			.updateTable("profiles")
			.set({ profileBio: bio, profileAvatarKey: avatarKey })
			.where("profileUserId", "=", session.userId)
			.execute();
	} else {
		await db
			.insertInto("profiles")
			.values({ profileUserId: session.userId, profileBio: bio, profileAvatarKey: avatarKey })
			.execute();
	}

	return { profileUserId: session.userId, bio, avatarKey };
});
