import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { requireSession } from "#lib/server/auth";

// Uploads travel as base64 data URLs inside the JSON RPC payload. Cap them at
// ~25 MiB of text (~18 MiB binary) so requests stay well inside Worker limits.
const MAX_DATA_URL_LENGTH = 26_214_400;

const UploadImageSchema = v.object({
	dataUrl: v.pipe(
		v.string(),
		v.minLength(64, "No image data received"),
		v.maxLength(MAX_DATA_URL_LENGTH, "Image is too large (max 18 MB)"),
	),
});

export type UploadImageInput = v.InferInput<typeof UploadImageSchema>;

export type UploadedImage = {
	key: string;
};

// Photos only — still raster formats. GIFs and anything else are rejected so
// only real photo uploads end up in the bucket.
const PHOTO_EXTENSIONS: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/avif": "avif",
	"image/heic": "heic",
	"image/heif": "heif",
};

export const uploadImage = command(UploadImageSchema, async (input): Promise<UploadedImage> => {
	const event = getRequestEvent();
	const session = requireSession(event);

	const platform = event.platform;
	if (!platform) {
		error(500, "Missing platform bindings");
	}

	const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(input.dataUrl);
	if (!match) {
		error(400, "Invalid image data");
	}
	const [, mime, base64] = match;

	const extension = PHOTO_EXTENSIONS[mime];
	if (!extension) {
		error(400, "Only photos can be uploaded (JPEG, PNG, WebP, AVIF, HEIC)");
	}

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	if (bytes.byteLength === 0) {
		error(400, "Empty image");
	}

	const key = `posts/${session.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
	await platform.env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });

	return { key };
});
