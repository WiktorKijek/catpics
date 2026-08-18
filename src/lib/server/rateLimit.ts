import { error } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

// ---------------------------------------------------------------------------
// In-app fixed-window attempt throttling, backed by Cloudflare KV. Counters
// are read with the minimum cacheTtl so updates propagate as fast as KV
// allows, and each key carries a TTL so stale IP counters never accumulate.
//
// KV is eventually consistent (writes are usually visible immediately in the
// region that wrote them, elsewhere within ~cacheTtl), so under heavy
// multi-region load a few extra attempts can slip through. That is acceptable
// for a best-effort throttle: the windows (5-10 min) are far longer than the
// propagation lag, so guessing stays bounded orders of magnitude below
// unlimited — and the free tier's ~1,000 writes/day also caps recorded auth
// events, which self-limits abuse.
// ---------------------------------------------------------------------------

export const AUTH_RATE_LIMITS = {
	/** Failed logins per username before the account is locked for the window. */
	loginPerUser: { max: 10, windowMs: 5 * 60_000 },
	/** Failed logins per IP before the IP is locked for the window. */
	loginPerIp: { max: 60, windowMs: 5 * 60_000 },
	/** Registration attempts per IP (successful or not). */
	registerPerIp: { max: 10, windowMs: 10 * 60_000 },
} as const;

export type RateLimitOptions = { max: number; windowMs: number };

/** Stored per key as JSON; `count` and the window start time in ms. */
type Counter = { count: number; windowStart: number };

/** Keep expired counters around for a while after the window so a late
 * `recordRateLimitHit` never resurrects a stale value. */
const TTL_BUFFER_SECONDS = 5 * 60;

/** Minimum allowed cacheTtl — fastest propagation of counter updates. */
const READ_CACHE_TTL = 30;

/**
 * The caller's IP. Cloudflare always sets `cf-connecting-ip` in production
 * (Workers sit behind the edge); the header fallbacks only matter in local
 * dev, where spoofing is not a concern.
 */
export function clientIp(event: RequestEvent): string {
	return (
		event.request.headers.get("cf-connecting-ip") ??
		event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"unknown"
	);
}

async function readCounter(kv: KVNamespace, key: string): Promise<Counter | null> {
	const raw = await kv.get(key, { cacheTtl: READ_CACHE_TTL });
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<Counter>;
		if (typeof parsed.count === "number" && typeof parsed.windowStart === "number") {
			return { count: parsed.count, windowStart: parsed.windowStart };
		}
	} catch {
		// Corrupt value — treat as absent; the next write replaces it.
	}
	return null;
}

async function writeCounter(
	kv: KVNamespace,
	key: string,
	counter: Counter,
	windowMs: number,
): Promise<void> {
	await kv.put(key, JSON.stringify(counter), {
		expirationTtl: Math.ceil(windowMs / 1000) + TTL_BUFFER_SECONDS,
	});
}

/**
 * Throws a 429 when `key` has already exhausted its allowance in the current
 * window. A missing or expired window is (re)started with this attempt counted
 * as the first one, so lockout never persists past `windowMs`.
 */
export async function assertRateLimit(
	kv: KVNamespace,
	key: string,
	{ max, windowMs }: RateLimitOptions,
): Promise<void> {
	const now = Date.now();
	const counter = await readCounter(kv, key);

	if (!counter || counter.windowStart < now - windowMs) {
		await writeCounter(kv, key, { count: 1, windowStart: now }, windowMs);
		return;
	}

	if (counter.count >= max) {
		error(429, "Too many attempts, try again later");
	}
}

/**
 * Counts one attempt for `key` in the current window. Pair with
 * `assertRateLimit` to record attempts after they happen (e.g. only count
 * failed logins, so a legitimate user's repeated successful logins never
 * trigger a lockout).
 */
export async function recordRateLimitHit(
	kv: KVNamespace,
	key: string,
	{ windowMs }: RateLimitOptions,
): Promise<void> {
	const counter = (await readCounter(kv, key)) ?? { count: 0, windowStart: Date.now() };
	await writeCounter(kv, key, { count: counter.count + 1, windowStart: counter.windowStart }, windowMs);
}
