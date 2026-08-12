import type { Handle } from "@sveltejs/kit";
import { createDb } from "#lib/server/db";
import { SESSION_COOKIE, validateSessionToken } from "#lib/server/session";

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const database = createDb(event.platform!.env.DB);

	event.locals.database = database;
	event.locals.session = token ? await validateSessionToken(database, token) : null;

	return resolve(event);
};
