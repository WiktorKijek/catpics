import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { requireSession } from "#lib/server/auth";

export type MyProfile = {
	userId: string;
	username: string;
	isAdmin: boolean;
	avatarKey: string | null;
	bio: string | null;
};

/** The logged-in user's own profile, used for the edit-profile form. */
export const getMyProfile = command(async (): Promise<MyProfile> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;

	const [user, profile] = await Promise.all([
		db
			.selectFrom("users")
			.select(["userId", "userUsername", "userIsAdmin"])
			.where("userId", "=", session.userId)
			.executeTakeFirst(),
		db
			.selectFrom("profiles")
			.select(["profileAvatarKey", "profileBio"])
			.where("profileUserId", "=", session.userId)
			.executeTakeFirst(),
	]);

	if (!user) {
		error(404, "User not found");
	}

	return {
		userId: user.userId,
		username: user.userUsername,
		isAdmin: user.userIsAdmin === 1,
		avatarKey: profile?.profileAvatarKey ?? null,
		bio: profile?.profileBio ?? null,
	};
});
