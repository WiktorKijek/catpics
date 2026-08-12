<script lang="ts">
	import { browser } from "$app/env";
	import "../app.css";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
			},
		},
	});

	const { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
