import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Serves post images and avatars from the `BUCKET` R2 binding. Keys are
 * long-lived and content is immutable, so responses are cached aggressively.
 *
 * Avatars are stored in two sizes, `<prefix>-512.webp` and `<prefix>-64.webp`.
 * A `?v=64` query selects the small variant (used for list avatars); anything
 * else serves the key as-is.
 */
export const GET: RequestHandler = async ({ params, platform, url }) => {
	if (!platform) {
		error(500, "Missing platform bindings");
	}

	let key = params.key;
	if (url.searchParams.get("v") === "64") {
		key = key.replace(/-512\.webp$/, "-64.webp");
	}

	const object = await platform.env.BUCKET.get(key);
	if (!object) {
		error(404, "Image not found");
	}

	const headers = new Headers();
	if (object.httpMetadata?.contentType) {
		headers.set("Content-Type", object.httpMetadata.contentType);
	}
	if (object.httpEtag) {
		headers.set("ETag", object.httpEtag);
	}
	headers.set("Cache-Control", "public, max-age=31536000, immutable");

	return new Response(object.body, { headers });
};
