import { command, getRequestEvent } from "$app/server";
import { deleteSession, SESSION_COOKIE } from "#lib/server/session";

export const logout = command(async () => {
	const event = getRequestEvent();

	if (event.locals.session) {
		await deleteSession(event.locals.database, event.locals.session.id);
	}

	event.cookies.delete(SESSION_COOKIE, { path: "/" });
});
