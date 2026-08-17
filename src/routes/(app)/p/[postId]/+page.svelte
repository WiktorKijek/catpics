<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import ErrorBoundary from "#lib/components/ErrorBoundary.svelte";
	import FeedPost from "#lib/components/FeedPost.svelte";
	import FeedSkeleton from "#lib/components/FeedSkeleton.svelte";
	import { usePost } from "#lib/queries/posts";

	// The post id comes from the route and never changes within this page.
	// svelte-ignore state_referenced_locally
	const postId = page.params.postId ?? "";
	const postQuery = usePost(postId);
	const post = $derived(postQuery.data ?? null);
</script>

<svelte:head>
	<title>{post ? `${post.author.username}'s post · catpics` : "Post · catpics"}</title>
</svelte:head>

<div class="-mx-4 w-[calc(100%+2rem)] sm:mx-auto sm:w-full sm:max-w-lg">
	{#if postQuery.isPending}
		<FeedSkeleton count={1} />
	{:else if postQuery.isError}
		<ErrorBoundary
			message="Something went wrong loading this post."
			onRetry={() => postQuery.refetch()}
		/>
	{:else if post}
		<FeedPost {post} session={page.data.session} onDeleted={() => goto("/")} />
	{/if}
</div>
