<script lang="ts">
	import { page } from "$app/state";
	import type { PageData } from "./$types";
	import ProfilePage from "#lib/components/ProfilePage.svelte";

	let { data }: { data: PageData } = $props();
</script>

<!--
	Keying on the username forces the profile subtree (and every query inside it)
	to be torn down and recreated when navigating between `/@user` pages. SvelteKit
	reuses this page component across same-route navigations, and relying on the
	query getters to reactively re-key has proven unreliable here (they can keep
	reading the previous username and serve the old profile's cached data).
-->
{#key data.username}
	<ProfilePage username={data.username} session={page.data.session} />
{/key}
