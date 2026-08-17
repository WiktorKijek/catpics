<script lang="ts">
	import { page } from "$app/state";
	import "../app.css";
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

<main class="grid min-h-dvh place-items-center px-4">
	<ErrorBoundary {message} onRetry={retry} />
</main>
