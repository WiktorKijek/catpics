/**
 * Turns an R2 object key into a browser-addressable URL.
 *
 * Keys that are already absolute URLs (e.g. https://...) pass through unchanged,
 * everything else is served by the `/images/[key]` proxy route backed by the
 * `BUCKET` R2 binding.
 *
 * `variant` selects an alternate stored size for avatars: "64" serves the
 * 64px square (`-64.webp`) instead of the default 512px (`-512.webp`).
 */
export function imageUrl(key: string | null, variant?: "64"): string | null {
	if (!key) return null;
	if (/^https?:\/\//i.test(key)) return key;
	const path = `/images/${key.split("/").map(encodeURIComponent).join("/")}`;
	return variant ? `${path}?v=${variant}` : path;
}