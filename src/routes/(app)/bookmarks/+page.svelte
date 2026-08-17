<script lang="ts">
	import { page } from "$app/state";
	import BookmarksFeed from "#lib/components/BookmarksFeed.svelte";
</script>

<svelte:head>
	<title>Bookmarks · catpics</title>
</svelte:head>

<BookmarksFeed session={page.data.session} />