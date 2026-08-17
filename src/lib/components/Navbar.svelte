<script lang="ts">
	import { Bookmark, Cat, Home, LogIn, LogOut, Plus, Users } from "@lucide/svelte";
	import PostComposer from "./PostComposer.svelte";
	import { imageUrl } from "#lib/images";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
		avatarKey: string | null;
	};

	let { session }: { session: Session | null } = $props();

	let postOpen = $state(false);

	const username = $derived(session?.username?.trim() ? session.username : "Account");
	const initial = $derived(username.charAt(0).toUpperCase());
	const avatarUrl = $derived(imageUrl(session?.avatarKey ?? null, "64"));
	const profileHref = $derived(
		session?.username ? `/@${encodeURIComponent(session.username)}` : "/login",
	);
</script>

<header class="sticky top-4 z-50 hidden px-4 sm:block">
	<nav
		class="navbar border-base-300 bg-base-100/90 mx-auto max-w-4xl rounded-full border px-3 shadow-lg"
	>
		<div class="navbar-start">
			<a href="/" class="flex items-center gap-2">
				<span
					class="bg-secondary text-secondary-content grid size-9 place-items-center rounded-full"
				>
					<Cat size={20} />
				</span>
				<span class="text-xl font-bold">catpics</span>
				<span class="badge badge-soft badge-accent badge-sm hidden xl:inline-flex"
					>beta</span
				>
			</a>
		</div>
		<div class="navbar-end gap-2">
			<a href="/users" class="btn btn-ghost btn-circle" title="Users">
				<Users size={20} />
			</a>
			{#if session}
				<a href="/bookmarks" class="btn btn-ghost btn-circle" title="Bookmarks">
					<Bookmark size={20} />
				</a>
				<button
					type="button"
					class="btn btn-ghost btn-circle"
					title="New post"
					onclick={() => (postOpen = true)}
				>
					<Plus size={20} />
				</button>
				<a
					href={profileHref}
					class="btn btn-ghost gap-2 rounded-full! pr-3 pl-2"
					title={username}
				>
					<div class="avatar avatar-online" class:avatar-placeholder={!avatarUrl}>
						<div class="bg-neutral text-neutral-content size-7 rounded-full">
							{#if avatarUrl}
								<img src={avatarUrl} alt={`${username}'s avatar`} />
							{:else}
								<span class="text-xs">{initial}</span>
							{/if}
						</div>
					</div>
					<span class="max-w-28 truncate text-sm font-semibold">{username}</span>
				</a>
			{:else}
				<a href="/login" class="btn btn-ghost rounded-full!">Log in</a>
			{/if}
		</div>
	</nav>
</header>

<nav class="dock sm:hidden">
	<a href="/">
		<Home size={20} />
		<span class="dock-label">Home</span>
	</a>
	<a href="/users">
		<Users size={20} />
		<span class="dock-label">Users</span>
	</a>
	{#if session}
		<a href="/bookmarks">
			<Bookmark size={20} />
			<span class="dock-label">Bookmarks</span>
		</a>
		<button type="button" title="New post" onclick={() => (postOpen = true)}>
			<Plus size={20} />
			<span class="dock-label">Post</span>
		</button>
	{/if}
	{#if session}
		<a href={profileHref} class="flex flex-col items-center gap-0.5">
			<div class="avatar" class:avatar-placeholder={!avatarUrl}>
				<div class="bg-neutral text-neutral-content size-7 rounded-full">
					{#if avatarUrl}
						<img src={avatarUrl} alt={`${username}'s avatar`} />
					{:else}
						<span>{initial}</span>
					{/if}
				</div>
			</div>
			<span class="dock-label">{username}</span>
		</a>
	{:else}
		<a href="/login">
			<LogIn size={20} />
			<span class="dock-label">Log in</span>
		</a>
	{/if}
</nav>

{#if session}
	<PostComposer bind:open={postOpen} {session} />
{/if}