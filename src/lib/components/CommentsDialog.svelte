<script lang="ts">
	import { Send } from "@lucide/svelte";
	import { useQueryClient, type InfiniteData } from "@tanstack/svelte-query";
	import { tick } from "svelte";
	import DialogDrawer from "./DialogDrawer.svelte";
	import type { Comment, CommentsPage } from "#routes/api/v1/comments/list.remote";
	import { formatTimeAgo } from "#lib/format";
	import { imageUrl } from "#lib/images";
	import { useCreateComment, usePostComments } from "#lib/queries/comments";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let {
		open = $bindable(false),
		postId,
		authorUsername,
		caption,
		session,
	}: {
		open?: boolean;
		postId: string;
		/** Post author's username, rendered for context above the comments. */
		authorUsername: string;
		caption: string | null;
		session: Session | null;
	} = $props();

	const queryClient = useQueryClient();
	// Comments are fetched only while the dialog is open (the query is shared and
	// cached by TanStack, so reopening is instant and refetches only when stale).
	// svelte-ignore state_referenced_locally
	const comments = usePostComments(postId, () => open);
	const create = useCreateComment();

	const allComments = $derived(comments.data?.pages.flatMap((page) => page.comments) ?? []);

	let text = $state("");
	let sending = $state(false);
	let errorMessage = $state<string | null>(null);
	let composer = $state<HTMLTextAreaElement>();

	// Focus the composer whenever the dialog opens (only useful when signed in).
	$effect(() => {
		if (open && session) {
			void tick().then(() => composer?.focus());
		}
	});

	function profileHref(username: string): string {
		return `/@${encodeURIComponent(username)}`;
	}

	function initial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	async function handleSubmit() {
		const trimmed = text.trim();
		if (!trimmed || !session || sending) return;
		sending = true;
		errorMessage = null;
		try {
			const created = await create.mutateAsync({ postId, text: trimmed });
			text = "";
			await tick();
			autoResize();
			// Show the new comment at the top of the list instantly. Feed previews
			// and comment counts refresh in the background via invalidation.
			queryClient.setQueryData<InfiniteData<CommentsPage>>(["comments", postId], (old) => {
				if (!old) return old;
				const comment: Comment = {
					commentId: created.commentId,
					author: {
						userId: created.authorId,
						username: created.authorUsername,
						avatarKey: null,
					},
					text: created.text,
					createdAt: created.createdAt,
				};
				return {
					...old,
					pages: old.pages.map((page, index) =>
						index === 0 ? { ...page, comments: [comment, ...page.comments] } : page,
					),
				};
			});
			// Safety net: if there was no cached comment list (e.g. the dialog
			// hasn't fetched yet), refetch so the new comment still appears.
			if (!comments.data) {
				queryClient.invalidateQueries({ queryKey: ["comments", postId] });
			}
			queryClient.invalidateQueries({ queryKey: ["feed"] });
			queryClient.invalidateQueries({ queryKey: ["post", postId] });
			queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
			queryClient.invalidateQueries({ queryKey: ["user-posts"] });
		} catch {
			errorMessage = "Couldn't post your comment. Try again.";
		} finally {
			sending = false;
		}
	}

	// Enter sends, Shift+Enter inserts a newline.
	function onComposerKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void handleSubmit();
		}
	}

	// Keep the composer at a compact, button-aligned height: shrink to the
	// text-content height and only let it grow up to max-height, then scroll.
	function autoResize() {
		if (!composer) return;
		composer.style.height = "auto";
		composer.style.height = `${Math.min(composer.scrollHeight, 10 * 16)}px`;
	}
</script>

<DialogDrawer bind:open title="Comments">
	<div class="flex flex-col gap-4">
		{#if caption}
			<p class="min-w-0 text-sm">
				<a class="link-hover font-bold" href={profileHref(authorUsername)}
					>{authorUsername}</a
				>
				<span class="ml-1">{caption}</span>
			</p>
		{/if}

		<ul class="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
			{#if comments.isPending}
				<li class="grid h-32 place-items-center">
					<span class="loading loading-spinner loading-md"></span>
				</li>
			{:else if comments.isError}
				<li class="flex flex-col items-center gap-2 py-8 text-center">
					<p class="text-base-content/60 text-sm">Couldn't load comments.</p>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => comments.refetch()}
					>
						Try again
					</button>
				</li>
			{:else if allComments.length === 0}
				<li class="text-base-content/50 py-8 text-center text-sm">
					No comments yet — be the first!
				</li>
			{:else}
				{#each allComments as comment (comment.commentId)}
					{@const avatarUrl = imageUrl(comment.author.avatarKey, "64")}
					{@const href = profileHref(comment.author.username)}
					<li class="flex items-start gap-2.5">
						<a
							{href}
							class="avatar"
							class:avatar-placeholder={!avatarUrl}
							aria-label={comment.author.username}
						>
							<div
								class="bg-neutral text-neutral-content size-7 shrink-0 rounded-full"
							>
								{#if avatarUrl}
									<img src={avatarUrl} alt={comment.author.username} />
								{:else}
									<span class="text-xs font-bold"
										>{initial(comment.author.username)}</span
									>
								{/if}
							</div>
						</a>
						<div class="min-w-0">
							<p class="text-sm break-words">
								<a class="link-hover font-bold" {href}>{comment.author.username}</a>
								<span class="ml-1">{comment.text}</span>
							</p>
							<p
								class="text-base-content/40 mt-0.5 text-[11px] tracking-wide uppercase"
							>
								{formatTimeAgo(comment.createdAt)}
							</p>
						</div>
					</li>
				{/each}
				{#if comments.hasNextPage}
					<li>
						<button
							type="button"
							class="btn btn-ghost btn-sm w-full"
							disabled={comments.isFetchingNextPage}
							onclick={() => comments.fetchNextPage()}
						>
							{#if comments.isFetchingNextPage}
								<span class="loading loading-spinner loading-sm"></span>
							{/if}
							Load more comments
						</button>
					</li>
				{/if}
			{/if}
		</ul>

		{#if session}
			<form
				class="flex items-center gap-2 border-t pt-3"
				onsubmit={(event) => {
					event.preventDefault();
					void handleSubmit();
				}}
			>
				<textarea
					bind:this={composer}
					bind:value={text}
					class="textarea w-full resize-none"
					style="min-height: 2.75rem; max-height: 10rem"
					rows="1"
					placeholder="Add a comment..."
					maxlength="500"
					disabled={sending}
					oninput={autoResize}
					onkeydown={onComposerKeydown}></textarea>
				<button
					type="submit"
					class="btn btn-primary btn-square btn-sm shrink-0"
					aria-label="Post comment"
					disabled={sending || !text.trim()}
				>
					{#if sending}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<Send size={18} />
					{/if}
				</button>
			</form>
			{#if errorMessage}
				<p class="text-error -mt-2 text-sm">{errorMessage}</p>
			{/if}
		{:else}
			<div class="flex flex-col items-center gap-2 border-t pt-3">
				<p class="text-base-content/60 text-sm">Log in to join the conversation.</p>
				<div class="flex gap-2">
					<a href="/login" class="btn btn-primary btn-sm">Log in</a>
					<a href="/register" class="btn btn-ghost btn-sm">Sign up</a>
				</div>
			</div>
		{/if}
	</div>
</DialogDrawer>
