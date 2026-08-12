import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { verifyPassword } from "#lib/server/password";
import { createSession, SESSION_COOKIE, SESSION_EXPIRY_SECONDS } from "#lib/server/session";

export type LoginInput = {
	login: string;
	password: string;
};

export type AccountInfo = {
	userId: string;
	username: string | null;
	isAdmin: boolean;
};

// hash used on every request to prevent timing-related attacks
const DUMMY_PASSWORD_HASH =
	"6adac34d879a0a2df435c61d84007837:0b2273d71adde8837b6112d3dec01f998f7b762ba0decbfeddfe52f5cfe95e3e";

export const login = command("unchecked", async (input: LoginInput): Promise<AccountInfo> => {
	const event = getRequestEvent();

	const login = input?.login?.trim();
	const password = input?.password;

	if (typeof login !== "string" || login.length === 0 || login.length > 254) {
		error(400, "Login must be between 1 and 254 characters");
	}
	if (typeof password !== "string" || password.length === 0 || password.length > 128) {
		error(400, "Password must be between 1 and 128 characters");
	}

	const account = await event.locals.database
		.selectFrom("logins")
		.select(["user_id", "password_hash"])
		.where("login", "=", login)
		.executeTakeFirst();

	const valid = await verifyPassword(account?.password_hash ?? DUMMY_PASSWORD_HASH, password);
	if (!account || !valid) {
		error(401, "Invalid login or password");
	}

	const session = await createSession(event.locals.database, account.user_id);
	event.cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_EXPIRY_SECONDS,
	});

	return { userId: session.userId, username: session.username, isAdmin: session.isAdmin };
});
