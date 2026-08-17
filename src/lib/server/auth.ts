import { error } from "@sveltejs/kit";
import type { Session } from "#lib/server/session";
import type { RequestEvent } from "@sveltejs/kit";

/**
 * Throws a 401 unless the request carries a valid session, and returns it.
 * Use at the top of any remote function that mutates user-owned data.
 */
export function requireSession(event: RequestEvent): Session {
	if (!event.locals.session) {
		error(401, "You must be logged in");
	}
	return event.locals.session;
}
