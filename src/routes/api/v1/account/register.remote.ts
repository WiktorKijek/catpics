import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import type { AccountInfo } from "./login.remote";
import { batch } from "#lib/server/db";
import { hashPassword } from "#lib/server/password";
import { assertRateLimit, AUTH_RATE_LIMITS, clientIp, recordRateLimitHit } from "#lib/server/rateLimit";
import { createSession, SESSION_COOKIE, SESSION_EXPIRY_SECONDS } from "#lib/server/session";

const RegisterInputSchema = v.object({
	username: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(2, "Username must be between 2 and 32 characters"),
		v.maxLength(32, "Username must be between 2 and 32 characters"),
		// Fold case so `Admin` and `admin` are the same account, and keep the
		// charset URL-safe and confusable-free (`[a-z0-9_]` also keeps the
		// /@username profile route reachable). Login folds the same way.
		v.toLowerCase(),
		v.regex(
			/^[a-z0-9_]+$/,
			"Username may only contain lowercase letters, digits and underscores",
		),
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

	const platform = event.platform;
	if (!platform) {
		error(500, "Missing platform bindings");
	}

	// Bound account creation per IP; every attempt (successful or not) counts.
	const ip = clientIp(event);
	await assertRateLimit(platform.env.AUTH_RATE_LIMIT_KV, `register:ip:${ip}`, AUTH_RATE_LIMITS.registerPerIp);
	await recordRateLimitHit(platform.env.AUTH_RATE_LIMIT_KV, `register:ip:${ip}`, AUTH_RATE_LIMITS.registerPerIp);

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
		// `batch` runs the two inserts in a single D1 batch so they land
		// atomically — if either fails, neither takes effect (no orphaned user).
		await batch(db, [
			db.insertInto("users").values({ userId, userUsername: username }).compile(),
			db
				.insertInto("logins")
				.values({ loginUserId: userId, loginPasswordHash: passwordHash })
				.compile(),
		]);
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
