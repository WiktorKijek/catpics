import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		return { session: null, offline: false };
	}

	const profile = await locals.database
		.selectFrom("profiles")
		.select("profileAvatarKey")
		.where("profileUserId", "=", locals.session.userId)
		.executeTakeFirst();

	return {
		session: {
			userId: locals.session.userId,
			isAdmin: locals.session.isAdmin,
			username: locals.session.username,
			avatarKey: profile?.profileAvatarKey ?? null,
		},
		offline: false,
	};
};
