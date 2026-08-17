<script lang="ts">
	import {
		Bookmark,
		Check,
		Heart,
		MessageCircle,
		MoreHorizontal,
		Send,
		Trash2,
	} from "@lucide/svelte";
	import { useQueryClient } from "@tanstack/svelte-query";
	import DialogDrawer from "./DialogDrawer.svelte";
	import DropdownMenu from "./DropdownMenu.svelte";
	import DropdownMenuItem from "./DropdownMenuItem.svelte";
	import type { FeedPost } from "#lib/queries/feed";
	import { formatLikes, formatTimeAgo } from "#lib/format";
	import { imageUrl } from "#lib/images";
	import { useBookmark, useUnbookmark } from "#lib/queries/bookmarks";
	import { useLike, useUnlike } from "#lib/queries/likes";
	import { useDeletePost } from "#lib/queries/posts";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let {
		post,
		session,
		onUnbookmarked,
		onDeleted,
	}: {
		post: FeedPost;
		session: Session | null;
		/** Called after this post is successfully removed from the viewer's bookmarks. */
		onUnbookmarked?: (postId: string) => void;
		/** Called after this post is successfully deleted (e.g. to leave the post page). */
		onDeleted?: (postId: string) => void;
	} = $props();

	// liked / bookmarked / likeCount are local optimistic state, intentionally
	// seeded from the props only once. The server is the source of truth: any
	// toggle first flips locally, then the mutation response (or an error)
	// reconciles the authoritative value.
	// svelte-ignore state_referenced_locally
	let liked = $state(post.likedByMe);
	// svelte-ignore state_referenced_locally
	let bookmarked = $state(post.bookmarkedByMe);
	// svelte-ignore state_referenced_locally
	let likeCount = $state(post.likeCount);
	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	async function sharePost() {
		const url = `${window.location.origin}/p/${encodeURIComponent(post.postId)}`;
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// Fallback for non-secure contexts where the Clipboard API is unavailable.
			const textarea = document.createElement("textarea");
			textarea.value = url;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			textarea.remove();
		}
		copied = true;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => (copied = false), 1500);
	}

	const like = useLike();
	const unlike = useUnlike();
	const bookmark = useBookmark();
	const unbookmark = useUnbookmark();
	const deleteMutation = useDeletePost();
	const queryClient = useQueryClient();

	const avatarUrl = $derived(imageUrl(post.author.avatarKey, "64"));
	const initial = $derived(post.author.username.charAt(0).toUpperCase());

	function profileHref(username: string): string {
		return `/@${encodeURIComponent(username)}`;
	}

	const canDelete = $derived(
		!!session && (session.userId === post.author.userId || session.isAdmin),
	);
	let confirmOpen = $state(false);
	let deleteError = $state<string | null>(null);

	async function handleDelete() {
		if (deleteMutation.isPending) return;
		deleteError = null;
		try {
			await deleteMutation.mutateAsync({ postId: post.postId });
			confirmOpen = false;
			// Drop the post everywhere it's cached: the home feed, the author's
			// profile grid, the bookmarks list and this post's detail query.
			queryClient.invalidateQueries({ queryKey: ["feed"] });
			queryClient.invalidateQueries({ queryKey: ["user-posts", post.author.userId] });
			queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
			queryClient.invalidateQueries({ queryKey: ["post", post.postId] });
			onDeleted?.(post.postId);
		} catch {
			deleteError = "Couldn't delete this post. Try again.";
		}
	}

	async function toggleLike() {
		if (!session || like.isPending || unlike.isPending) return;
		const wasLiked = liked;
		liked = !wasLiked;
		likeCount += wasLiked ? -1 : 1;
		try {
			const result = wasLiked
				? await unlike.mutateAsync({ postId: post.postId })
				: await like.mutateAsync({ postId: post.postId });
			liked = result.liked;
			likeCount = result.likeCount;
		} catch {
			liked = wasLiked;
			likeCount += wasLiked ? 1 : -1;
		}
	}

	async function toggleBookmark() {
		if (!session || bookmark.isPending || unbookmark.isPending) return;
		const wasBookmarked = bookmarked;
		bookmarked = !wasBookmarked;
		try {
			const result = wasBookmarked
				? await unbookmark.mutateAsync({ postId: post.postId })
				: await bookmark.mutateAsync({ postId: post.postId });
			bookmarked = result.bookmarked;
			if (!result.bookmarked) onUnbookmarked?.(post.postId);
		} catch {
			bookmarked = wasBookmarked;
		}
	}
</script>

<article class="bg-base-100 sm:border-base-300 overflow-hidden sm:rounded-2xl sm:border">
	<header class="flex items-center gap-3 px-4 py-3">
		<a
			href={profileHref(post.author.username)}
			class="focus-visible:outline-primary flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
			aria-label={`Open ${post.author.username}'s profile`}
		>
			<div class="avatar" class:avatar-placeholder={!avatarUrl}>
				<div class="bg-neutral text-neutral-content size-9 rounded-full">
					{#if avatarUrl}
						<img src={avatarUrl} alt={post.author.username} />
					{:else}
						<span class="text-sm font-bold">{initial}</span>
					{/if}
				</div>
			</div>
			<div class="min-w-0">
				<p class="link-hover truncate text-sm font-bold">{post.author.username}</p>
				{#if post.location}
					<p class="text-base-content/60 truncate text-xs">{post.location}</p>
				{/if}
			</div>
		</a>
		{#if canDelete}
			<DropdownMenu
				side="bottom"
				align="end"
				sideOffset={8}
				triggerClass="btn btn-ghost btn-circle btn-sm ms-auto"
				contentClass="w-44"
				label="More options"
				title="More options"
			>
				{#snippet trigger()}
					<MoreHorizontal size={20} />
				{/snippet}
				<DropdownMenuItem onSelect={() => (confirmOpen = true)} class="text-error">
					<Trash2 size={16} />
					Delete post
				</DropdownMenuItem>
			</DropdownMenu>
		{/if}
	</header>

	{#if post.imageKeys.length > 1}
		<div class="carousel carousel-center carousel-horizontal aspect-[4/5] w-full">
			{#each post.imageKeys as key (key)}
				<div class="carousel-item w-full">
					<img
						src={imageUrl(key) ?? ""}
						alt={post.caption ?? "Photo"}
						class="aspect-[4/5] w-full object-cover"
						loading="lazy"
					/>
				</div>
			{/each}
		</div>
	{:else if post.imageKeys.length === 1}
		<img
			src={imageUrl(post.imageKeys[0]) ?? ""}
			alt={post.caption ?? "Photo"}
			class="aspect-[4/5] w-full object-cover"
			loading="lazy"
		/>
	{/if}

	<div class="flex items-center gap-1 px-3 pt-3">
		<button
			class="btn btn-ghost btn-circle btn-sm"
			class:text-error={liked}
			aria-label={liked ? "Unlike" : "Like"}
			title={session ? undefined : "Log in to like"}
			disabled={!session || like.isPending || unlike.isPending}
			onclick={toggleLike}
		>
			<Heart size={24} fill={liked ? "currentColor" : "none"} />
		</button>
		<button class="btn btn-ghost btn-circle btn-sm" aria-label="Comment">
			<MessageCircle size={24} />
		</button>
		<button
			class="btn btn-ghost btn-circle btn-sm"
			class:text-success={copied}
			aria-label={copied ? "Link copied" : "Copy link"}
			title={copied ? "Link copied" : "Copy link"}
			onclick={sharePost}
		>
			{#if copied}
				<Check size={24} />
			{:else}
				<Send size={24} />
			{/if}
		</button>
		<button
			class="btn btn-ghost btn-circle btn-sm ms-auto"
			aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
			title={session ? undefined : "Log in to bookmark"}
			disabled={!session || bookmark.isPending || unbookmark.isPending}
			onclick={toggleBookmark}
		>
			<Bookmark size={24} fill={bookmarked ? "currentColor" : "none"} />
		</button>
	</div>

	<div class="flex flex-col gap-1.5 px-4 py-3 text-sm">
		<p class="font-bold">{formatLikes(likeCount)} likes</p>
		{#if post.caption}
			<p>
				<a class="link-hover font-bold" href={profileHref(post.author.username)}
					>{post.author.username}</a
				>
				<span class="ml-1">{post.caption}</span>
			</p>
		{/if}
		{#if post.commentCount > post.comments.length}
			<button class="text-base-content/60 w-fit text-start">
				View all {post.commentCount} comments
			</button>
		{/if}
		{#each post.comments as comment (comment.commentId)}
			<p class="text-sm">
				<a class="link-hover font-bold" href={profileHref(comment.authorUsername)}
					>{comment.authorUsername}</a
				>
				<span class="ml-1">{comment.text}</span>
			</p>
		{/each}
		<p class="text-base-content/40 mt-1 text-[11px] tracking-wide uppercase">
			{formatTimeAgo(post.createdAt)}
		</p>
	</div>
</article>

<DialogDrawer
	bind:open={confirmOpen}
	title="Delete this post?"
	description="This permanently removes the post, its likes, bookmarks and comments. This can't be undone."
>
	<div class="flex flex-col gap-4">
		{#if deleteError}
			<p class="text-error text-sm">{deleteError}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button
				type="button"
				class="btn btn-ghost"
				disabled={deleteMutation.isPending}
				onclick={() => (confirmOpen = false)}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-error gap-2"
				disabled={deleteMutation.isPending}
				onclick={handleDelete}
			>
				{#if deleteMutation.isPending}
					<span class="loading loading-spinner loading-sm"></span>
					Deleting...
				{:else}
					<Trash2 size={16} />
					Delete
				{/if}
			</button>
		</div>
	</div>
</DialogDrawer>
