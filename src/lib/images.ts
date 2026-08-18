/**
 * Turns an R2 object key into a browser-addressable URL.
 *
 * Only keys under the app's own `posts/` and `avatars/` namespaces render;
 * anything else (absolute URLs, foreign prefixes) yields null so that
 * user-controlled key values can never turn an `<img src>` into a third-party
 * tracking request or a spoofed content source.
 *
 * `variant` selects an alternate stored size for avatars: "64" serves the
 * 64px square (`-64.webp`) instead of the default 512px (`-512.webp`).
 */
export function imageUrl(key: string | null, variant?: "64"): string | null {
	if (!key) return null;
	if (!/^(posts|avatars)\//.test(key)) return null;
	const path = `/images/${key.split("/").map(encodeURIComponent).join("/")}`;
	return variant ? `${path}?v=${variant}` : path;
}
