<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { ArrowLeft, Check, Ellipsis, Grid3X3, LogOut, Pencil } from "@lucide/svelte";
	import { createQuery } from "@tanstack/svelte-query";
	import DropdownMenu from "./DropdownMenu.svelte";
	import DropdownMenuItem from "./DropdownMenuItem.svelte";
	import ErrorBoundary from "./ErrorBoundary.svelte";
	import ProfileEditDialog from "./ProfileEditDialog.svelte";
	import UserPostGrid from "./UserPostGrid.svelte";
	import { formatLikes } from "#lib/format";
	import { imageUrl } from "#lib/images";
	import { useLogout } from "#lib/queries/account";
	import { useFollow, useUnfollow } from "#lib/queries/follows";
	import { getProfile, type PublicProfile } from "#routes/api/v1/profile/get.remote";
	import { getStreak } from "#routes/api/v1/streaks/get.remote";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { username, session }: { username: string; session: Session | null } = $props();

	const profileQuery = createQuery(() => ({
		// `followedByMe` makes this viewer-dependent, so key by viewer + username.
		queryKey: ["profile", session?.username ?? "", username],
		queryFn: () => getProfile({ username }),
		enabled: username.trim().length > 0,
	}));

	const streakQuery = createQuery(() => {
		const userId = profileQuery.data?.userId;
		return {
			queryKey: ["streaks", userId ?? ""],
			queryFn: () => getStreak({ userId: userId ?? "" }),
			enabled: Boolean(userId),
		};
	});

	type StreakTier = {
		key: string;
		min: number;
		color: string;
	};

	const STREAK_TIERS: StreakTier[] = [
		{ key: "spark", min: 0, color: "#facc15" },
		{ key: "glow", min: 3, color: "#f97316" },
		{ key: "flame", min: 7, color: "#ef4444" },
		{ key: "obsidian", min: 14, color: "#111827" },
		{ key: "sapphire", min: 30, color: "#2563eb" },
	];

	function getTier(days: number): StreakTier {
		return [...STREAK_TIERS].reverse().find((tier) => days >= tier.min) ?? STREAK_TIERS[0];
	}

	const profile = $derived<PublicProfile | null>(profileQuery.data ?? null);
	const isOwnProfile = $derived(profile?.userId === session?.userId);
	// The streak is only ever shown as a colored ring around the avatar.
	const tier = $derived(streakQuery.data ? getTier(streakQuery.data.current) : null);
	const avatarUrl = $derived(imageUrl(profile?.avatarKey ?? null));
	const initial = $derived((profile?.username ?? username).charAt(0).toUpperCase());

	let editOpen = $state(false);

	let following = $state(false);
	let followerCount = $state(0);
	$effect(() => {
		if (profileQuery.data) {
			following = profileQuery.data.followedByMe;
			followerCount = profileQuery.data.followerCount;
		}
	});

	const follow = useFollow();
	const unfollow = useUnfollow();
	const logout = useLogout();

	async function handleLogout() {
		await logout.mutateAsync();
		await invalidateAll();
	}

	async function toggleFollowing() {
		if (!profile || follow.isPending || unfollow.isPending) return;
		const wasFollowing = following;
		following = !wasFollowing;
		followerCount += wasFollowing ? -1 : 1;
		try {
			const result = wasFollowing
				? await unfollow.mutateAsync({ userId: profile.userId })
				: await follow.mutateAsync({ userId: profile.userId });
			following = result.followed;
			followerCount = result.followerCount;
		} catch {
			following = wasFollowing;
			followerCount += wasFollowing ? 1 : -1;
		}
	}
</script>

<svelte:head>
	<title>{profile ? `${profile.username} · catpics` : "Profile · catpics"}</title>
	<meta
		name="description"
		content={profile
			? `See ${profile.username}'s latest catpics.`
			: "Explore a catpics profile."}
	/>
</svelte:head>

<div class="mx-auto w-full max-w-4xl pt-4">
	{#if profileQuery.isPending && !profileQuery.data}
		<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
			<div class="skeleton size-28 shrink-0 rounded-full sm:size-40"></div>
			<div class="flex min-w-0 flex-1 flex-col gap-3">
				<div class="skeleton h-7 w-48"></div>
				<div class="skeleton h-4 w-32"></div>
				<div class="skeleton h-16 w-full max-w-md"></div>
			</div>
		</div>
	{:else if profileQuery.isError}
		<ErrorBoundary
			message="Something went wrong loading this profile."
			onRetry={() => profileQuery.refetch()}
		/>
	{:else if profile}
		<div class="flex flex-col gap-6 sm:flex-row sm:gap-10">
			<div class="flex shrink-0 justify-center sm:block">
				<div
					class={tier
						? "bg-base-100 size-28 rounded-full border-[0.2rem] border-[var(--streak-color)] p-2 sm:size-40"
						: "size-28 sm:size-40"}
					style={tier ? `--streak-color: ${tier.color};` : ""}
				>
					<div class="avatar h-full w-full" class:avatar-placeholder={!avatarUrl}>
						<div class="bg-neutral text-neutral-content h-full w-full rounded-full">
							{#if avatarUrl}
								<img src={avatarUrl} alt={`${profile.username}'s profile`} />
							{:else}
								<span class="text-4xl font-bold sm:text-5xl">{initial}</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">
						{profile.username}
					</h1>
					{#if session}
						<DropdownMenu
							side="bottom"
							align="end"
							sideOffset={6}
							triggerClass="btn btn-ghost btn-circle btn-sm"
							contentClass="w-44"
							title="More actions"
							label="More actions"
						>
							{#snippet trigger()}
								<Ellipsis size={16} />
							{/snippet}
							{#if isOwnProfile}
								<DropdownMenuItem onSelect={() => (editOpen = true)}>
									<Pencil size={15} />
									Edit profile
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={handleLogout}
									disabled={logout.isPending}
									class="text-error"
								>
									<LogOut size={16} />
									Log out
								</DropdownMenuItem>
							{/if}
						</DropdownMenu>
					{/if}
					{#if profile.isAdmin}
						<span class="badge badge-soft badge-info badge-sm gap-1">
							<Check size={12} />
							Admin
						</span>
					{/if}
					{#if !isOwnProfile}
						<button
							type="button"
							class={`btn btn-sm sm:btn-md gap-2 ${following ? "btn-outline" : ""}`}
							onclick={toggleFollowing}
							disabled={follow.isPending || unfollow.isPending}
							aria-pressed={following}
						>
							{#if following}<Check size={16} />{/if}
							{following ? "Following" : "Follow"}
						</button>
					{/if}
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<span
						><b class="font-bold">{formatLikes(profile.postCount)}</b>
						posts</span
					>
					<span
						><b class="font-bold">{formatLikes(followerCount)}</b>
						followers</span
					>
					<span
						><b class="font-bold">{formatLikes(profile.followingCount)}</b>
						following</span
					>
				</div>

				<p class="mt-3 max-w-xl text-sm leading-6">
					{profile.bio ?? "No bio here yet."}
				</p>
			</div>
		</div>

		<div class="border-base-300 mt-8 border-b">
			<div role="tablist" class="tabs">
				<button
					type="button"
					role="tab"
					class="tab tab-active gap-2 font-bold"
					aria-selected="true"
				>
					<Grid3X3 size={15} />
					Posts
				</button>
			</div>
		</div>

		<UserPostGrid userId={profile.userId} />

		{#if isOwnProfile}
			<ProfileEditDialog
				bind:open={editOpen}
				username={profile.username}
				avatarKey={profile.avatarKey}
				bio={profile.bio}
			/>
		{/if}
	{:else}
		<ErrorBoundary
			message="We couldn't find this profile."
			onRetry={() => profileQuery.refetch()}
		/>
	{/if}
</div>
