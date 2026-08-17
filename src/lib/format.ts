/** Compact count formatting for like/follower numbers, e.g. 1234 -> "1.2k". */
export function formatLikes(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

/** Relative "time ago" label for a UTC epoch-millisecond timestamp. */
export function formatTimeAgo(timestamp: number): string {
	const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
	const weeks = Math.floor(days / 7);
	if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
	const years = Math.floor(days / 365);
	return `${years} year${years === 1 ? "" : "s"} ago`;
}
