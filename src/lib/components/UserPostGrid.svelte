<script lang="ts">
	import { Heart, Loader2, MessageCircle } from "@lucide/svelte";
	import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
	import ErrorBoundary from "./ErrorBoundary.svelte";
	import { formatLikes } from "#lib/format";
	import { imageUrl } from "#lib/images";
	import { useUserPosts } from "#lib/queries/posts";

	let { userId }: { userId: string } = $props();

	// The grid is mounted with a stable user id once the profile is loaded.
	// svelte-ignore state_referenced_locally
	const postsQuery = useUserPosts(userId);
	const posts = $derived(postsQuery.data?.pages.flatMap((page) => page.posts) ?? []);

	function coverUrl(key: string | null, postId: string): string {
		return imageUrl(key) ?? `https://picsum.photos/seed/${encodeURIComponent(postId)}/600/600`;
	}

	// The grid is 3 columns, so virtualize one row at a time (up to 3 tiles per row).
	const COLS = 3;
	const MOBILE_GAP = 4; // 0.25rem (gap-1)
	const DESKTOP_GAP = 8; // 0.5rem (sm:gap-2)
	const SM_MIN_WIDTH = 640; // tailwind `sm` breakpoint

	const rows = $derived(
		Array.from({ length: Math.ceil(posts.length / COLS) }, (_, i) =>
			posts.slice(i * COLS, i * COLS + COLS),
		),
	);

	// Tiles are aspect-square, so a row's height follows the grid's width. Track it
	// so offscreen rows can be sized accurately before they are measured.
	let gridEl = $state<HTMLDivElement>();
	let gridWidth = $state(0);

	$effect(() => {
		const el = gridEl;
		if (!el) return;

		const observer = new ResizeObserver(() => {
			gridWidth = el.clientWidth;
		});
		observer.observe(el);
		return () => observer.disconnect();
	});

	function estimateRowHeight(): number {
		if (gridWidth <= 0) return 640;
		const gap = gridWidth >= SM_MIN_WIDTH ? DESKTOP_GAP : MOBILE_GAP;
		const tileSize = (gridWidth - gap * (COLS - 1)) / COLS;
		return tileSize + gap;
	}

	const virtualizer = createWindowVirtualizer({
		count: 0,
		estimateSize: estimateRowHeight,
		overscan: 4,
		getItemKey: (index) => rows[index]?.[0]?.postId ?? index,
	});

	$effect(() => {
		if ($virtualizer.options.count !== rows.length) {
			$virtualizer.setOptions({ count: rows.length });
		}
	});

	function measureElement(node: HTMLElement) {
		$virtualizer.measureElement(node);
	}

	let sentinel = $state<HTMLDivElement>();

	$effect(() => {
		const el = sentinel;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (
					entries[0]?.isIntersecting &&
					postsQuery.hasNextPage &&
					!postsQuery.isFetchingNextPage
				) {
					void postsQuery.fetchNextPage();
				}
			},
			{ rootMargin: "1200px 0px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

{#if postsQuery.isPending}
	<div class="-mx-4 grid w-[calc(100%+2rem)] grid-cols-3 gap-1 sm:mx-auto sm:w-full sm:gap-2">
		{#each Array(9) as _, index (index)}
			<div class="skeleton aspect-square rounded-none"></div>
		{/each}
	</div>
{:else if postsQuery.isError}
	<div>
		<ErrorBoundary
			message="Something went wrong loading these posts."
			onRetry={() => postsQuery.refetch()}
		/>
	</div>
{:else if posts.length === 0}
	<div class="p-10 text-center">
		<div class="bg-base-200 mx-auto grid size-12 place-items-center rounded-full">
			<MessageCircle class="text-base-content/50" size={20} />
		</div>
		<h2 class="mt-4 font-bold">No posts yet</h2>
		<p class="text-base-content/60 mt-1 text-sm">The first catpic is still on its way.</p>
	</div>
{:else}
	<div
		bind:this={gridEl}
		class="relative -mx-4 w-[calc(100%+2rem)] sm:mx-auto sm:w-full"
		style="height: {$virtualizer.getTotalSize()}px"
	>
		{#each $virtualizer.getVirtualItems() as item (item.key)}
			<div
				data-index={item.index}
				use:measureElement
				class="absolute inset-x-0"
				style="top: {item.start}px"
			>
				<div class="grid grid-cols-3 gap-1 pb-1 sm:gap-2 sm:pb-2">
					{#each rows[item.index] as post (post.postId)}
						<a
							href={`/p/${encodeURIComponent(post.postId)}`}
							class="profile-grid-tile group bg-base-300 relative block aspect-square overflow-hidden"
							aria-label={`Open ${post.postId} post`}
						>
							<figure class="relative aspect-square overflow-hidden">
								<img
									src={coverUrl(post.coverKey, post.postId)}
									alt={`${post.postId} post`}
									class="profile-grid-image h-full w-full object-cover"
									loading="lazy"
								/>
								<figcaption
									class="profile-grid-overlay from-neutral/80 absolute inset-0 flex items-end bg-gradient-to-t via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 [transition-timing-function:var(--ease-out)] group-hover:opacity-100"
								>
									<span
										class="text-neutral-content flex items-center gap-3 text-xs font-bold"
									>
										<span class="flex items-center gap-1"
											><Heart size={13} fill="currentColor" />
											{formatLikes(post.likeCount)}</span
										>
										<span class="flex items-center gap-1"
											><MessageCircle size={13} />
											{formatLikes(post.commentCount)}</span
										>
									</span>
								</figcaption>
							</figure>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	{#if postsQuery.isFetchingNextPage}
		<div class="flex justify-center py-8">
			<Loader2 class="text-base-content/50 animate-spin" size={28} />
		</div>
	{/if}

	<div bind:this={sentinel} class="h-px"></div>
{/if}

<style>
	@media (hover: hover) and (pointer: fine) {
		.profile-grid-tile:hover .profile-grid-image {
			transform: scale(1.04);
		}
	}

	.profile-grid-image {
		transition: transform 200ms var(--ease-out);
	}

	@media (prefers-reduced-motion: reduce) {
		.profile-grid-image,
		.profile-grid-overlay {
			transition: none;
		}
	}
</style>
