import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { hashPassword } from "#lib/server/password";
import { createSession, SESSION_COOKIE, SESSION_EXPIRY_SECONDS } from "#lib/server/session";
import type { AccountInfo } from "./login.remote";

export type RegisterInput = {
	username: string;
	login: string;
	password: string;
};

export const register = command(
	"unchecked",
	async (input: RegisterInput): Promise<AccountInfo> => {
		const event = getRequestEvent();
		const db = event.locals.database;

		const username = input?.username?.trim();
		const login = input?.login?.trim();
		const password = input?.password;

		if (typeof username !== "string" || username.length < 2 || username.length > 32) {
			error(400, "Username must be between 2 and 32 characters");
		}
		if (typeof login !== "string" || login.length < 3 || login.length > 254) {
			error(400, "Login must be between 3 and 254 characters");
		}
		if (typeof password !== "string" || password.length < 8 || password.length > 128) {
			error(400, "Password must be between 8 and 128 characters");
		}

		const existing = await db
			.selectFrom("logins")
			.select("user_id")
			.where("login", "=", login)
			.executeTakeFirst();
		if (existing) {
			error(409, "An account with this login already exists");
		}

		const userId = crypto.randomUUID();
		const passwordHash = await hashPassword(password);

		try {
			// kysely-d1 doesn't support `db.transaction()` (it throws "Transactions are not
			// supported yet"), so run the two inserts sequentially. The UNIQUE constraint on
			// `logins.login` catches the race where another request creates the same login
			// between the check above and the insert.
			await db.insertInto("users").values({ id: userId, username }).execute();
			await db
				.insertInto("logins")
				.values({ user_id: userId, login, password_hash: passwordHash })
				.execute();
		} catch (e) {
			// Another request created this login between the check above and the insert
			if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
				error(409, "An account with this login already exists");
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
	},
);
