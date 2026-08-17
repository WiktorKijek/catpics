import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";

const GetProfileSchema = v.pipe(
	v.object({
		userId: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100, "User id is too long"))),
		username: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(32, "Username is too long"))),
	}),
	v.check(
		(lookup) => lookup.userId !== undefined || lookup.username !== undefined,
		"Provide a user id or username",
	),
);

export type ProfileLookup = v.InferInput<typeof GetProfileSchema>;

export type PublicProfile = {
	userId: string;
	username: string;
	isAdmin: boolean;
	avatarKey: string | null;
	bio: string | null;
	postCount: number;
	followerCount: number;
	followingCount: number;
	followedByMe: boolean;
};

/**
 * A user's public profile with follower/following/post counts and the viewer's
 * follow state. Public — a session only adds `followedByMe`.
 */
export const getProfile = command(GetProfileSchema, async (input): Promise<PublicProfile> => {
	const event = getRequestEvent();
	const db = event.locals.database;
	const viewerId = event.locals.session?.userId ?? null;

	let userQuery = db.selectFrom("users").select(["userId", "userUsername", "userIsAdmin"]);
	userQuery = input.userId
		? userQuery.where("userId", "=", input.userId)
		: userQuery.where("userUsername", "=", input.username!);

	const user = await userQuery.executeTakeFirst();
	if (!user) {
		error(404, "User not found");
	}

	const profile = await db
		.selectFrom("profiles")
		.select(["profileAvatarKey", "profileBio"])
		.where("profileUserId", "=", user.userId)
		.executeTakeFirst();

	const [[postCount], [followerCount], [followingCount], followed] = await Promise.all([
		db
			.selectFrom("posts")
			.select(db.fn.countAll().as("count"))
			.where("postAuthorId", "=", user.userId)
			.execute(),
		db
			.selectFrom("follows")
			.select(db.fn.countAll().as("count"))
			.where("followFollowingId", "=", user.userId)
			.execute(),
		db
			.selectFrom("follows")
			.select(db.fn.countAll().as("count"))
			.where("followFollowerId", "=", user.userId)
			.execute(),
		viewerId
			? db
					.selectFrom("follows")
					.select("followFollowingId")
					.where("followFollowerId", "=", viewerId)
					.where("followFollowingId", "=", user.userId)
					.executeTakeFirst()
			: null,
	]);

	return {
		userId: user.userId,
		username: user.userUsername,
		isAdmin: user.userIsAdmin === 1,
		avatarKey: profile?.profileAvatarKey ?? null,
		bio: profile?.profileBio ?? null,
		postCount: Number(postCount?.count ?? 0),
		followerCount: Number(followerCount?.count ?? 0),
		followingCount: Number(followingCount?.count ?? 0),
		followedByMe: Boolean(followed),
	};
});
