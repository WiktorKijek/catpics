<script lang="ts">
	import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "@lucide/svelte";
	import { formatLikes, type FeedPost } from "#lib/mock/feed";

	let { post }: { post: FeedPost } = $props();

	let liked = $state(false);
	let bookmarked = $state(false);
	let likeCount = $state(post.likeCount);

	function toggleLike() {
		liked = !liked;
		likeCount += liked ? 1 : -1;
	}
</script>

<article
	class="border-base-300 bg-base-100 overflow-hidden rounded-2xl border"
>
	<header class="flex items-center gap-3 px-4 py-3">
		<div class="avatar">
			<div class="bg-secondary text-secondary-content size-9 rounded-full">
				<img src={post.user.avatarUrl} alt={post.user.name} />
			</div>
		</div>
		<div class="min-w-0">
			<p class="truncate text-sm font-bold">{post.user.username}</p>
			{#if post.location}
				<p class="text-base-content/60 truncate text-xs">{post.location}</p>
			{/if}
		</div>
		<button class="btn btn-ghost btn-circle btn-sm ms-auto" aria-label="More options">
			<MoreHorizontal size={20} />
		</button>
	</header>

	<img
		src={post.imageUrl}
		alt={post.caption}
		class="aspect-[4/5] w-full object-cover"
		loading="lazy"
	/>

	<div class="flex items-center gap-1 px-3 pt-3">
		<button
			class="btn btn-ghost btn-circle btn-sm"
			class:text-error={liked}
			aria-label={liked ? "Unlike" : "Like"}
			onclick={toggleLike}
		>
			<Heart size={24} fill={liked ? "currentColor" : "none"} />
		</button>
		<button class="btn btn-ghost btn-circle btn-sm" aria-label="Comment">
			<MessageCircle size={24} />
		</button>
		<button class="btn btn-ghost btn-circle btn-sm" aria-label="Share">
			<Send size={24} />
		</button>
		<button
			class="btn btn-ghost btn-circle btn-sm ms-auto"
			aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
			onclick={() => (bookmarked = !bookmarked)}
		>
			<Bookmark size={24} fill={bookmarked ? "currentColor" : "none"} />
		</button>
	</div>

	<div class="flex flex-col gap-1.5 px-4 py-3 text-sm">
		<p class="font-bold">{formatLikes(likeCount)} likes</p>
		<p>
			<span class="font-bold">{post.user.username}</span>
			<span class="ml-1">{post.caption}</span>
		</p>
		{#if post.commentCount > post.comments.length}
			<button class="text-base-content/60 w-fit text-start">
				View all {post.commentCount} comments
			</button>
		{/if}
		{#each post.comments as comment (comment.id)}
			<p class="text-sm">
				<span class="font-bold">{comment.username}</span>
				<span class="ml-1">{comment.text}</span>
			</p>
		{/each}
		<p class="text-base-content/40 mt-1 text-[11px] uppercase tracking-wide">
			{post.timeAgo}
		</p>
	</div>
</article>
