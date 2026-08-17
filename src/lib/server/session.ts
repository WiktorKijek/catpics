// https://lucia-auth.com/sessions/basic

import type { DB } from "./db/types";
import type { Kysely } from "kysely";

export const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;

export const SESSION_COOKIE = "session";

export type Session = {
	id: string;
	secretHash: Uint8Array;
	createdAt: Date;
	userId: string;
	isAdmin: boolean;
	username: string | null;
};

type SessionWithToken = Session & {
	token: string;
};

function generateSecureRandomString(): string {
	// Human readable alphabet (a-z, 0-9 without l, o, 0, 1 to avoid confusion)
	const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

	// Generate 24 bytes = 192 bits of entropy.
	// We're only going to use 5 bits per byte so the total entropy will be 192 * 5 / 8 = 120 bits
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);

	let id = "";
	for (let i = 0; i < bytes.length; i++) {
		// >> 3 "removes" the right-most 3 bits of the byte
		id += alphabet[bytes[i] >> 3];
	}
	return id;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}
	let c = 0;
	for (let i = 0; i < a.byteLength; i++) {
		c |= a[i] ^ b[i];
	}
	return c === 0;
}

async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer);
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

export async function createSession(db: Kysely<DB>, userId: string): Promise<SessionWithToken> {
	const now = new Date();

	const user = await db
		.selectFrom("users")
		.select(["userIsAdmin", "userUsername"])
		.where("userId", "=", userId)
		.executeTakeFirst();
	if (!user) {
		throw new Error("User not found");
	}

	const id = generateSecureRandomString();
	const secret = generateSecureRandomString();
	const secretHash = await hashSecret(secret);

	const token = id + "." + secret;

	const session: SessionWithToken = {
		id,
		secretHash,
		createdAt: now,
		token,
		userId,
		isAdmin: user.userIsAdmin === 1,
		username: user.userUsername,
	};

	await db
		.insertInto("sessions")
		.values({
			sessionId: session.id,
			sessionSecretHash: toHex(session.secretHash),
			sessionCreatedAt: session.createdAt.getTime(),
			sessionUserId: userId,
		})
		.execute();

	return session;
}

export async function validateSessionToken(db: Kysely<DB>, token: string): Promise<Session | null> {
	const tokenParts = token.split(".");
	if (tokenParts.length !== 2) {
		return null;
	}
	const sessionId = tokenParts[0];
	const sessionSecret = tokenParts[1];

	const session = await getSession(db, sessionId);
	if (!session) {
		return null;
	}

	const tokenSecretHash = await hashSecret(sessionSecret);
	const validSecret = constantTimeEqual(tokenSecretHash, session.secretHash);
	if (!validSecret) {
		return null;
	}

	return session;
}

export async function getSession(db: Kysely<DB>, sessionId: string): Promise<Session | null> {
	const now = new Date();

	const sessionWithUser = await db
		.selectFrom("sessions")
		.innerJoin("users", "users.userId", "sessions.sessionUserId")
		.select([
			"sessions.sessionId",
			"sessions.sessionSecretHash",
			"sessions.sessionCreatedAt",
			"sessions.sessionUserId",
			"users.userIsAdmin",
			"users.userUsername",
		])
		.where("sessions.sessionId", "=", sessionId)
		.executeTakeFirst();

	if (!sessionWithUser) return null;

	// Check expiration
	if (now.getTime() - sessionWithUser.sessionCreatedAt >= SESSION_EXPIRY_SECONDS * 1000) {
		await deleteSession(db, sessionId);
		return null;
	}

	return {
		id: sessionWithUser.sessionId,
		secretHash: fromHex(sessionWithUser.sessionSecretHash),
		createdAt: new Date(sessionWithUser.sessionCreatedAt),
		userId: sessionWithUser.sessionUserId,
		isAdmin: sessionWithUser.userIsAdmin === 1,
		username: sessionWithUser.userUsername,
	};
}

export async function deleteSession(db: Kysely<DB>, sessionId: string): Promise<void> {
	await db.deleteFrom("sessions").where("sessionId", "=", sessionId).execute();
}
