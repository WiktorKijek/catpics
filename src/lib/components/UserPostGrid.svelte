<script lang="ts">
	import { Heart, MessageCircle } from "@lucide/svelte";
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
</script>

{#if postsQuery.isPending}
	<div class="grid grid-cols-3 gap-1 sm:gap-2">
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
	<div class="grid grid-cols-3 gap-1 sm:gap-2">
		{#each posts as post (post.postId)}
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
					<span class="text-neutral-content flex items-center gap-3 text-xs font-bold">
						<span class="flex items-center gap-1"
							><Heart size={13} fill="currentColor" />
							{formatLikes(post.likeCount)}</span
						>
						<span class="flex items-center gap-1"
							><MessageCircle size={13} /> {formatLikes(post.commentCount)}</span
						>
					</span>
				</figcaption>
			</figure>
			</a>
		{/each}
	</div>

	{#if postsQuery.hasNextPage}
		<div class="flex justify-center p-4">
			<button
				class="btn btn-ghost btn-sm"
				type="button"
				onclick={() => postsQuery.fetchNextPage()}
				disabled={postsQuery.isFetchingNextPage}
			>
				{#if postsQuery.isFetchingNextPage}<span class="loading loading-spinner loading-xs"
					></span>{/if}
				Load more
			</button>
		</div>
	{/if}
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
