import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { verifyPassword } from "#lib/server/password";
import {
	assertRateLimit,
	AUTH_RATE_LIMITS,
	clientIp,
	recordRateLimitHit,
} from "#lib/server/rateLimit";
import { createSession, SESSION_COOKIE, SESSION_EXPIRY_SECONDS } from "#lib/server/session";

const LoginInputSchema = v.object({
	username: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "Username must be between 1 and 254 characters"),
		v.maxLength(254, "Username must be between 1 and 254 characters"),
	),
	password: v.pipe(
		v.string(),
		v.minLength(1, "Password must be between 1 and 128 characters"),
		v.maxLength(128, "Password must be between 1 and 128 characters"),
	),
});

export type LoginInput = v.InferInput<typeof LoginInputSchema>;

export type AccountInfo = {
	userId: string;
	username: string | null;
	isAdmin: boolean;
};

// hash used on every request to prevent timing-related attacks
const DUMMY_PASSWORD_HASH =
	"6adac34d879a0a2df435c61d84007837:0b2273d71adde8837b6112d3dec01f998f7b762ba0decbfeddfe52f5cfe95e3e";

export const login = command(LoginInputSchema, async (input): Promise<AccountInfo> => {
	const event = getRequestEvent();
	const db = event.locals.database;

	// Registration folds usernames to lowercase, so fold the login input the
	// same way — case variants keep resolving to the same account.
	const username = input.username.trim().toLowerCase();
	const ip = clientIp(event);

	const platform = event.platform;
	if (!platform) {
		error(500, "Missing platform bindings");
	}

	// Bound online guessing before the expensive hash runs: a locked key is
	// rejected cheaply. Counts only failed attempts (recorded below).
	await assertRateLimit(
		platform.env.AUTH_RATE_LIMIT_KV,
		`login:user:${username}`,
		AUTH_RATE_LIMITS.loginPerUser,
	);
	await assertRateLimit(
		platform.env.AUTH_RATE_LIMIT_KV,
		`login:ip:${ip}`,
		AUTH_RATE_LIMITS.loginPerIp,
	);

	const account = await db
		.selectFrom("logins")
		.innerJoin("users", "users.userId", "logins.loginUserId")
		.select(["logins.loginUserId", "logins.loginPasswordHash"])
		.where("users.userUsername", "=", username)
		.executeTakeFirst();

	const valid = await verifyPassword(
		account?.loginPasswordHash ?? DUMMY_PASSWORD_HASH,
		input.password,
	);

	if (!account || !valid) {
		// Wrong credentials (or unknown username — the dummy hash keeps the
		// timing uniform) count against both throttles.
		await recordRateLimitHit(
			platform.env.AUTH_RATE_LIMIT_KV,
			`login:user:${username}`,
			AUTH_RATE_LIMITS.loginPerUser,
		);
		await recordRateLimitHit(
			platform.env.AUTH_RATE_LIMIT_KV,
			`login:ip:${ip}`,
			AUTH_RATE_LIMITS.loginPerIp,
		);
		error(401, "Invalid username or password");
	}

	const session = await createSession(db, account.loginUserId);
	event.cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_EXPIRY_SECONDS,
	});

	return { userId: session.userId, username: session.username, isAdmin: session.isAdmin };
});
