<script lang="ts">
	import { Loader2 } from "@lucide/svelte";
	import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
	import ErrorBoundary from "./ErrorBoundary.svelte";
	import FeedPost from "./FeedPost.svelte";
	import FeedSkeleton from "./FeedSkeleton.svelte";
	import { useFeed } from "#lib/queries/feed";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { session }: { session: Session | null } = $props();

	const feed = useFeed(() => session?.username ?? "");

	const posts = $derived(feed.data?.pages.flatMap((page) => page.posts) ?? []);

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
				if (entries[0]?.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) {
					void feed.fetchNextPage();
				}
			},
			{ rootMargin: "1200px 0px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

{#if feed.isPending}
	<FeedSkeleton count={3} />
{:else if feed.isError}
	<ErrorBoundary
		message="Something went wrong loading the feed."
		onRetry={() => feed.refetch()}
	/>
{:else if posts.length === 0}
	<div class="-mx-4 flex w-[calc(100%+2rem)] flex-col items-center gap-2 py-24 text-center sm:mx-auto sm:w-full sm:max-w-lg">
		<span class="text-4xl font-bold" aria-hidden="true">:(</span>
		<p class="text-base-content/70 text-lg font-semibold">Nothing here yet</p>
		<p class="text-base-content/50 text-sm">
			Posts will show up here once someone shares the first cat pic.
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
				class="absolute inset-x-0"
				style="top: {item.start}px"
			>
				<FeedPost post={posts[item.index]} {session} />
			</div>
		{/each}
	</div>

	{#if feed.isFetchingNextPage}
		<div class="flex justify-center py-8">
			<Loader2 class="text-base-content/50 animate-spin" size={28} />
		</div>
	{/if}

	<div bind:this={sentinel} class="h-px"></div>
{/if}
