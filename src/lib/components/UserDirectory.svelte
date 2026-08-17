<script lang="ts">
	import { Loader2, Search, X } from "@lucide/svelte";
	import ErrorBoundary from "./ErrorBoundary.svelte";
	import UserRow from "./UserRow.svelte";
	import { useUsers } from "#lib/queries/users";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { session }: { session: Session | null } = $props();

	let searchInput = $state("");
	let search = $state("");

	// Debounce the search box so we don't fire a request on every keystroke.
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => (search = searchInput.trim()), 300);
		return () => clearTimeout(debounceTimer);
	});

	const users = useUsers(() => search);

	const rows = $derived(users.data?.pages.flatMap((page) => page.users) ?? []);

	let sentinel = $state<HTMLDivElement>();

	$effect(() => {
		const el = sentinel;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && users.hasNextPage && !users.isFetchingNextPage) {
					void users.fetchNextPage();
				}
			},
			{ rootMargin: "600px 0px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>Users · catpics</title>
	<meta name="description" content="Browse everyone on catpics." />
</svelte:head>

<div class="mx-auto w-full max-w-2xl">
	<div class="mb-4 flex items-center justify-between gap-3">
		<h1 class="text-2xl font-extrabold tracking-tight">Users</h1>
	</div>

	<label class="input mb-4 w-full gap-2">
		<Search size={16} class="text-base-content/50 shrink-0" />
		<input
			type="search"
			class="grow"
			placeholder="Search users…"
			aria-label="Search users"
			bind:value={searchInput}
		/>
		{#if searchInput}
			<button
				type="button"
				class="btn btn-ghost btn-circle btn-xs shrink-0"
				title="Clear search"
				aria-label="Clear search"
				onclick={() => (searchInput = "")}
			>
				<X size={14} />
			</button>
		{/if}
	</label>

	{#if users.isPending}
		<ul
			class="list border-base-300 bg-base-100 -mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 border-y sm:mx-auto sm:w-full sm:rounded-2xl sm:border-x"
		>
			{#each [0, 1, 2, 3, 4] as i (i)}
				<li class="list-row gap-3 px-3 py-2.5">
					<div class="skeleton size-12 shrink-0 rounded-full"></div>
					<div class="flex flex-col gap-1.5">
						<div class="skeleton h-4 w-28"></div>
						<div class="skeleton h-3 w-20"></div>
					</div>
				</li>
			{/each}
		</ul>
	{:else if users.isError}
		<ErrorBoundary
			message="Something went wrong loading users."
			onRetry={() => users.refetch()}
		/>
	{:else if rows.length === 0}
		<div
			class="border-base-300 bg-base-100 flex w-full flex-col items-center gap-2 rounded-2xl border px-4 py-16 text-center"
		>
			<span class="text-4xl font-bold" aria-hidden="true">:(</span>
			<p class="text-base-content/70 text-lg font-semibold">No users found</p>
			<p class="text-base-content/50 text-sm">
				{search
					? `Nobody on catpics matches “${search}”. Try a different search.`
					: "Users will show up here once someone joins."}
			</p>
		</div>
	{:else}
		<ul
			class="list border-base-300 bg-base-100 -mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 border-y sm:mx-auto sm:w-full sm:rounded-2xl sm:border-x"
		>
			{#each rows as user (user.userId)}
				<UserRow {user} {session} />
			{/each}
		</ul>

		{#if users.isFetchingNextPage}
			<div class="flex justify-center py-8">
				<Loader2 class="text-base-content/50 animate-spin" size={28} />
			</div>
		{/if}

		<div bind:this={sentinel} class="h-px"></div>
	{/if}
</div>
