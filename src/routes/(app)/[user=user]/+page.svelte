<script lang="ts">
	import { page } from "$app/state";
	import type { PageData } from "./$types";
	import ProfilePage from "#lib/components/ProfilePage.svelte";

	let { data }: { data: PageData } = $props();
</script>

<ProfilePage username={data.username} session={page.data.session} />
