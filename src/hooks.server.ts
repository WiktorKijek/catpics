import type { Handle, HandleServerError } from "@sveltejs/kit/hooks";
import { createDb } from "#lib/server/db";
import { SESSION_COOKIE, validateSessionToken } from "#lib/server/session";

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const database = createDb(event.platform!.env.DB);

	event.locals.database = database;
	event.locals.session = token ? await validateSessionToken(database, token) : null;

	return resolve(event);
};

// Remote functions (e.g. `command`) validate their arguments with a Standard Schema
// (valibot) on the server. Surface the first issue's message to the client instead of
// the generic "Bad Request" so users get actionable feedback.
export const handleError: HandleServerError = ({ kind, issues }) => {
	if (kind === "validation") {
		return { message: issues[0]?.message ?? "Bad Request" };
	}
};
