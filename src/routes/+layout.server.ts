import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		return { session: null, offline: false };
	}

	return {
		session: {
			userId: locals.session.userId,
			isAdmin: locals.session.isAdmin,
			username: locals.session.username,
		},
		offline: false,
	};
};
