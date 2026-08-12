// cloudflare is dumb, they don't support argon2 (cause the existing libraries use node bindings)
// scrypt MIGHT be supported but it's through node compatibility
// the best option is PBKDF2, although it only supports 100k iterations
// as opposed to the 600k that OWASP recommends
// https://lord.technology/2024/02/21/hashing-passwords-on-cloudflare-workers.html
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

export async function hashPassword(password: string, providedSalt?: Uint8Array): Promise<string> {
	const encoder = new TextEncoder();
	// Use provided salt if available, otherwise generate a new one
	const salt = providedSalt || crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits", "deriveKey"],
	);
	const key = await crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			// @ts-expect-error: yeah, i know
			salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);
	const exportedKey = (await crypto.subtle.exportKey("raw", key)) as ArrayBuffer;
	const hashBuffer = new Uint8Array(exportedKey);
	const hashArray = Array.from(hashBuffer);
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${saltHex}:${hashHex}`;
}

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function verifyPassword(
	storedHash: string,
	passwordAttempt: string,
): Promise<boolean> {
	const [saltHex, originalHash] = storedHash.split(":");
	const matchResult = saltHex.match(/.{1,2}/g);
	if (!matchResult) {
		throw new Error("Invalid salt format");
	}
	const salt = new Uint8Array(matchResult.map((byte) => parseInt(byte, 16)));
	const attemptHashWithSalt = await hashPassword(passwordAttempt, salt);
	const [, attemptHash] = attemptHashWithSalt.split(":");
	return constantTimeEqual(attemptHash, originalHash);
}
