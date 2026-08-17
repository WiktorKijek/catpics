import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

const UpdateProfileSchema = v.object({
	bio: v.optional(
		v.pipe(v.string(), v.trim(), v.maxLength(200, "Bio must be at most 200 characters")),
	),
	avatarKey: v.optional(
		v.pipe(v.string(), v.trim(), v.maxLength(500, "Avatar key must be at most 500 characters")),
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
