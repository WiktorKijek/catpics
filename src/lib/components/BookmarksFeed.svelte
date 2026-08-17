<script lang="ts">
	import { Loader2 } from "@lucide/svelte";
	import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
	import { useQueryClient, type InfiniteData } from "@tanstack/svelte-query";
	import ErrorBoundary from "./ErrorBoundary.svelte";
	import FeedPost from "./FeedPost.svelte";
	import FeedSkeleton from "./FeedSkeleton.svelte";
	import { useBookmarkedPosts, type FeedPage } from "#lib/queries/bookmarks";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { session }: { session: Session | null } = $props();

	const queryClient = useQueryClient();
	const bookmarks = useBookmarkedPosts({ enabled: !!session });

	const posts = $derived(bookmarks.data?.pages.flatMap((page) => page.posts) ?? []);

	const virtualizer = createWindowVirtualizer({
		count: 0,
		estimateSize: () => 640,
		overscan: 4,
		getItemKey: (index) => posts[index]?.postId ?? index,
	});

	$effect(() => {
		if ($virtualizer.options.count !== posts.length) {
			$virtualizer.setOptions({ count: posts.length });
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
					bookmarks.hasNextPage &&
					!bookmarks.isFetchingNextPage
				) {
					void bookmarks.fetchNextPage();
				}
			},
			{ rootMargin: "1200px 0px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	// Removing a bookmark while viewing the saved list should drop the post
	// from the list immediately. The mutation already reconciled the server
	// state, so just filter it out of the cached pages (structure is preserved,
	// so cursors and page params stay aligned).
	function onUnbookmarked(postId: string) {
		queryClient.setQueryData<InfiniteData<FeedPage>>(["bookmarks", "list"], (old) => {
			if (!old) return old;
			return {
				...old,
				pages: old.pages.map((page) =>
					page.posts.some((post) => post.postId === postId)
						? { ...page, posts: page.posts.filter((post) => post.postId !== postId) }
						: page,
				),
			};
		});
	}
</script>

{#if !session}
	<div
		class="-mx-4 flex w-[calc(100%+2rem)] flex-col items-center gap-2 py-24 text-center sm:mx-auto sm:w-full sm:max-w-lg"
	>
		<span class="text-4xl font-bold" aria-hidden="true">:(</span>
		<p class="text-base-content/70 text-lg font-semibold">Log in to see your saved posts</p>
		<p class="text-base-content/50 text-sm">Bookmarks are personal — sign in to view them here.</p>
		<a href="/login" class="btn rounded-full! mt-2">Log in</a>
	</div>
{:else if bookmarks.isPending}
	<FeedSkeleton count={3} />
{:else if bookmarks.isError}
	<ErrorBoundary
		message="Something went wrong loading your bookmarks."
		onRetry={() => bookmarks.refetch()}
	/>
{:else if posts.length === 0}
	<div
		class="-mx-4 flex w-[calc(100%+2rem)] flex-col items-center gap-2 py-24 text-center sm:mx-auto sm:w-full sm:max-w-lg"
	>
		<span class="text-4xl font-bold" aria-hidden="true">:(</span>
		<p class="text-base-content/70 text-lg font-semibold">No saved posts yet</p>
		<p class="text-base-content/50 text-sm">
			Tap the bookmark icon on a post to save it here.
		</p>
	</div>
{:else}
	<div
		class="relative -mx-4 w-[calc(100%+2rem)] sm:mx-auto sm:w-full sm:max-w-lg"
		style="height: {$virtualizer.getTotalSize()}px"
	>
		{#each $virtualizer.getVirtualItems() as item (item.key)}
			<div
				data-index={item.index}
				use:measureElement
				class="absolute inset-x-0 top-0"
				style="transform: translateY({item.start}px)"
			>
				<FeedPost
					post={posts[item.index]}
					{session}
					onUnbookmarked={onUnbookmarked}
				/>
			</div>
		{/each}
	</div>

	{#if bookmarks.isFetchingNextPage}
		<div class="flex justify-center py-8">
			<Loader2 class="text-base-content/50 animate-spin" size={28} />
		</div>
	{/if}

	<div bind:this={sentinel} class="h-px"></div>
{/if}