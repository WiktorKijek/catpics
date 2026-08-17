<script lang="ts">
	import { Check } from "@lucide/svelte";
	import type { UserSummary } from "#routes/api/v1/users/list.remote";
	import { formatLikes } from "#lib/format";
	import { imageUrl } from "#lib/images";
	import { useFollow, useUnfollow } from "#lib/queries/follows";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { user, session }: { user: UserSummary; session: Session | null } = $props();

	const profileHref = $derived(`/@${encodeURIComponent(user.username)}`);
	const avatarUrl = $derived(imageUrl(user.avatarKey, "64"));
	const initial = $derived(user.username.charAt(0).toUpperCase());
	const isSelf = $derived(user.userId === session?.userId);

	let following = $state(false);
	let followerCount = $state(0);
	// Sync local state from the query data; only touches state when the server
	// value actually differs, so optimistic updates aren't clobbered.
	$effect(() => {
		if (user.followedByMe !== following) following = user.followedByMe;
		if (user.followerCount !== followerCount) followerCount = user.followerCount;
	});

	const follow = useFollow();
	const unfollow = useUnfollow();

	async function toggleFollowing() {
		if (follow.isPending || unfollow.isPending) return;
		const wasFollowing = following;
		following = !wasFollowing;
		followerCount += wasFollowing ? -1 : 1;
		try {
			const result = wasFollowing
				? await unfollow.mutateAsync({ userId: user.userId })
				: await follow.mutateAsync({ userId: user.userId });
			following = result.followed;
			followerCount = result.followerCount;
		} catch {
			following = wasFollowing;
			followerCount += wasFollowing ? 1 : -1;
		}
	}
</script>

<li class="list-row hover:bg-base-200/60 relative gap-3 px-3 py-2.5 transition-colors">
	<!-- Stretched link covering the whole row; the follow button stacks above it. -->
	<a
		href={profileHref}
		class="focus-visible:outline-primary absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
		aria-label={`Open ${user.username}'s profile`}
	></a>

	<div class="avatar shrink-0" class:avatar-placeholder={!avatarUrl}>
		<div class="bg-neutral text-neutral-content size-12 rounded-full">
			{#if avatarUrl}
				<img src={avatarUrl} alt={`${user.username}'s avatar`} />
			{:else}
				<span class="text-lg font-bold">{initial}</span>
			{/if}
		</div>
	</div>

	<div class="min-w-0">
		<p class="truncate font-bold">{user.username}</p>
		<p class="text-base-content/60 text-sm">
			{formatLikes(followerCount)} follower{followerCount === 1 ? "" : "s"}
		</p>
	</div>

	{#if !isSelf && session}
		<button
			type="button"
			class={`btn btn-sm relative z-10 shrink-0 gap-2 ${following ? "btn-outline" : ""}`}
			onclick={toggleFollowing}
			disabled={follow.isPending || unfollow.isPending}
			aria-pressed={following}
		>
			{#if following}<Check size={16} />{/if}
			{following ? "Following" : "Follow"}
		</button>
	{/if}
</li>
