<script lang="ts">
	import { page } from "$app/state";
	import UserDirectory from "#lib/components/UserDirectory.svelte";
</script>

<UserDirectory session={page.data.session} />