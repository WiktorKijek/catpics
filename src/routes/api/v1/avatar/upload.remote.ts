import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

// Uploads travel as base64 data URLs inside the JSON RPC payload. The client
// crops, squares and encodes both avatar sizes (512px + 64px webp) with canvas
// before this endpoint sees them, so each payload is small — stay well inside
// Worker limits.
const MAX_DATA_URL_LENGTH = 4_194_304; // 4 MiB of text (~3 MiB binary)

const UploadAvatarSchema = v.object({
	// The 512px webp avatar: stored as `<prefix>-512.webp`.
	dataUrl512: v.pipe(
		v.string(),
		v.regex(/^data:image\/webp;base64,/, "Avatar must be a WebP image"),
		v.minLength(64, "No image data received"),
		v.maxLength(MAX_DATA_URL_LENGTH, "Image is too large (max 3 MB)"),
	),
	// The 64px webp avatar: stored as `<prefix>-64.webp`.
	dataUrl64: v.pipe(
		v.string(),
		v.regex(/^data:image\/webp;base64,/, "Avatar must be a WebP image"),
		v.minLength(64, "No image data received"),
		v.maxLength(MAX_DATA_URL_LENGTH, "Image is too large (max 3 MB)"),
	),
});

export type UploadAvatarInput = v.InferInput<typeof UploadAvatarSchema>;

export type UploadedAvatar = {
	/** Object key of the 512px avatar; the 64px variant shares its prefix. */
	key: string;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
	const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	if (bytes.byteLength === 0) {
		error(400, "Empty image");
	}
	return bytes;
}

export const uploadAvatar = command(UploadAvatarSchema, async (input): Promise<UploadedAvatar> => {
	const event = getRequestEvent();
	const session = requireSession(event);
	const db = event.locals.database;
	const platform = event.platform;
	if (!platform) {
		error(500, "Missing platform bindings");
	}

	const stamp = `${Date.now()}-${crypto.randomUUID()}`;
	const base = `avatars/${session.userId}/${stamp}`;
	await Promise.all([
		platform.env.BUCKET.put(`${base}-512.webp`, dataUrlToBytes(input.dataUrl512), {
			httpMetadata: { contentType: "image/webp" },
		}),
		platform.env.BUCKET.put(`${base}-64.webp`, dataUrlToBytes(input.dataUrl64), {
			httpMetadata: { contentType: "image/webp" },
		}),
	]);

	// The previous avatar pair would otherwise accumulate forever. Best-effort:
	// the new pair already landed, so a failed cleanup only leaks one pair.
	// Only ever touch keys under the session user's own avatar namespace.
	const previous = await db
		.selectFrom("profiles")
		.select("profileAvatarKey")
		.where("profileUserId", "=", session.userId)
		.executeTakeFirst();
	const previousKey = previous?.profileAvatarKey;
	if (
		previousKey?.startsWith(`avatars/${session.userId}/`) &&
		previousKey.endsWith("-512.webp")
	) {
		await platform.env.BUCKET.delete([
			previousKey,
			previousKey.replace("-512.webp", "-64.webp"),
		]).catch(() => {});
	}

	return { key: `${base}-512.webp` };
});
