import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, setHeaders }) => {
	// Personalized responses must never enter the service worker's runtime
	// cache: a cached copy of a logged-in app shell would leak this user's
	// identity (username, avatar, admin status) to the next person using the
	// same browser profile offline. Anonymous shells stay cacheable, so the
	// offline app-shell feature keeps working with a neutral shell.
	if (locals.session) {
		setHeaders({ "cache-control": "no-store" });
	}

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
