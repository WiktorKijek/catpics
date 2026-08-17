<script lang="ts">
	import { page } from "$app/state";
	import Feed from "#lib/components/Feed.svelte";
</script>

<Feed session={page.data.session} />
