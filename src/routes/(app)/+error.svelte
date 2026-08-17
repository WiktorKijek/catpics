<script lang="ts">
	import { page } from "$app/state";
	import ErrorBoundary from "#lib/components/ErrorBoundary.svelte";

	const message = $derived(
		page.status === 404 ? "That page wandered off." : "Something went wrong loading this page.",
	);

	function retry() {
		location.reload();
	}
</script>

<svelte:head>
	<title>{page.status === 404 ? "Page not found" : "Something went wrong"} · catpics</title>
</svelte:head>

<ErrorBoundary {message} onRetry={retry} />
