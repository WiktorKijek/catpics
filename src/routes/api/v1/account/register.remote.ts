import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import type { AccountInfo } from "./login.remote";
import { hashPassword } from "#lib/server/password";
import { createSession, SESSION_COOKIE, SESSION_EXPIRY_SECONDS } from "#lib/server/session";

const RegisterInputSchema = v.object({
	username: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(2, "Username must be between 2 and 32 characters"),
		v.maxLength(32, "Username must be between 2 and 32 characters"),
	),
	password: v.pipe(
		v.string(),
		v.minLength(8, "Password must be between 8 and 128 characters"),
		v.maxLength(128, "Password must be between 8 and 128 characters"),
	),
});

export type RegisterInput = v.InferInput<typeof RegisterInputSchema>;

export const register = command(RegisterInputSchema, async (input): Promise<AccountInfo> => {
	const event = getRequestEvent();
	const db = event.locals.database;

	const { username, password } = input;

	const existingUsername = await db
		.selectFrom("users")
		.select("userId")
		.where("userUsername", "=", username)
		.executeTakeFirst();

	if (existingUsername) {
		error(409, "This username is already taken");
	}

	const userId = crypto.randomUUID();
	const passwordHash = await hashPassword(password);

	try {
		// d1 doesn't support transactions (kysely-d1 throws "Transactions are not
		// supported yet"), so run the two inserts sequentially.
		await db.insertInto("users").values({ userId, userUsername: username }).execute();
		await db
			.insertInto("logins")
			.values({ loginUserId: userId, loginPasswordHash: passwordHash })
			.execute();
	} catch (e) {
		// Another request created this username between the check above and the
		// insert. `users.user_username` is unique, so disambiguate by the column
		// reported by SQLite.
		if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
			error(409, "This username is already taken");
		}
		throw e;
	}

	const session = await createSession(db, userId);
	event.cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_EXPIRY_SECONDS,
	});

	return { userId: session.userId, username: session.username, isAdmin: session.isAdmin };
});
