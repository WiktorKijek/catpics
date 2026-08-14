<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { Cat, Home, LogIn, LogOut, Plus } from "@lucide/svelte";
	import { useLogout } from "#lib/queries/account";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { session }: { session: Session | null } = $props();

	const logout = useLogout();

	const username = $derived(session?.username?.trim() ? session.username : "Account");
	const initial = $derived(username.charAt(0).toUpperCase());

	async function handleLogout() {
		await logout.mutateAsync();
		await invalidateAll();
	}
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
			{#if session}
				<button type="button" class="btn btn-ghost btn-circle" title="New post">
					<Plus size={20} />
				</button>
				<details class="dropdown dropdown-end">
					<summary class="btn btn-ghost gap-2 rounded-full! pr-3 pl-2" title={username}>
						<div class="avatar avatar-online avatar-placeholder">
							<div class="bg-neutral text-neutral-content size-7 rounded-full">
								<span class="text-xs">{initial}</span>
							</div>
						</div>
						<span class="max-w-28 truncate text-sm font-semibold">{username}</span>
					</summary>
					<div
						class="dropdown-content rounded-box border-base-300 bg-base-100 mt-3 w-60 border p-2 shadow-xl"
					>
						<div class="flex items-center gap-3 px-2 py-2">
							<div class="avatar avatar-online avatar-placeholder">
								<div class="bg-neutral text-neutral-content size-11 rounded-full">
									<span class="text-lg font-bold">{initial}</span>
								</div>
							</div>
							<div class="min-w-0">
								<p class="truncate font-bold">{username}</p>
								{#if session.isAdmin}
									<span class="badge badge-soft badge-info badge-sm mt-1"
										>Admin</span
									>
								{/if}
							</div>
						</div>
						<div class="divider my-1"></div>
						<button
							type="button"
							class="btn btn-ghost btn-sm text-error! w-full justify-start gap-2"
							onclick={handleLogout}
							disabled={logout.isPending}
						>
							<LogOut size={16} />
							Log out
						</button>
					</div>
				</details>
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
	{#if session}
		<button type="button" title="New post">
			<Plus size={20} />
			<span class="dock-label">Post</span>
		</button>
	{/if}
	{#if session}
		<details class="dropdown dropdown-top">
			<summary class="flex cursor-pointer flex-col items-center gap-0.5">
				<div class="avatar avatar-placeholder">
					<div class="bg-neutral text-neutral-content size-7 rounded-full">
						<span>{initial}</span>
					</div>
				</div>
				<span class="dock-label">{username}</span>
			</summary>
			<ul
				class="dropdown-content menu bg-base-100 rounded-box border-base-300 w-44 border shadow-md"
			>
				<li>
					<button
						type="button"
						class="text-error"
						onclick={handleLogout}
						disabled={logout.isPending}
					>
						<LogOut size={16} />
						Log out
					</button>
				</li>
			</ul>
		</details>
	{:else}
		<a href="/login">
			<LogIn size={20} />
			<span class="dock-label">Log in</span>
		</a>
	{/if}
</nav>
