<script lang="ts">
	import { get } from "svelte/store";
	import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
	import { Loader2 } from "@lucide/svelte";
	import { useFeed } from "#lib/queries/feed";
	import FeedPost from "./FeedPost.svelte";

	const feed = useFeed();

	const posts = $derived(feed.data?.pages.flatMap((page) => page.posts) ?? []);

	const virtualizer = createWindowVirtualizer({
		count: 0,
		estimateSize: () => 640,
		overscan: 4,
		getItemKey: (index) => posts[index]?.id ?? index,
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
	<div class="mx-auto flex w-full max-w-lg flex-col gap-4">
		{#each [0, 1, 2] as i (i)}
			<div class="border-base-300 bg-base-100 overflow-hidden rounded-2xl border">
				<div class="flex items-center gap-3 px-4 py-3">
					<div class="skeleton size-9 rounded-full"></div>
					<div class="flex flex-col gap-1">
						<div class="skeleton h-3 w-28"></div>
						<div class="skeleton h-2.5 w-20"></div>
					</div>
				</div>
				<div class="skeleton aspect-[4/5] w-full rounded-none"></div>
				<div class="flex flex-col gap-2 px-4 py-3">
					<div class="skeleton h-6 w-24"></div>
					<div class="skeleton h-3 w-full"></div>
					<div class="skeleton h-3 w-3/4"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if feed.isError}
	<div class="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-16">
		<p class="text-base-content/60">Something went wrong loading the feed.</p>
		<button class="btn btn-soft" onclick={() => feed.refetch()}>Try again</button>
	</div>
{:else}
	<div
		class="relative mx-auto w-full max-w-lg"
		style="height: {$virtualizer.getTotalSize()}px"
	>
		{#each $virtualizer.getVirtualItems() as item (item.key)}
			<div
				data-index={item.index}
				use:measureElement
				class="absolute inset-x-0 top-0"
				style="transform: translateY({item.start}px)"
			>
				<FeedPost post={posts[item.index]} />
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
